import enquirer from "enquirer";
import type { Settings } from "@/config";
import {
  loadConfig,
  PROVIDER_CHOICES,
  PROVIDER_META,
  type Provider,
  saveConfig,
} from "@/config";

export interface RuntimeOverrides {
  provider?: Settings["provider"];
  model?: string;
}

// Helper to set nested path in object
function setPath<T>(
  obj: T,
  path: Array<string | number>,
  value: unknown
): void {
  let current: unknown = obj;
  for (let i = 0; i < path.length - 1; i++) {
    const key = path[i];
    if (typeof key === "string" || typeof key === "number") {
      current = (current as Record<string | number, unknown>)[key];
    }
  }
  const lastKey = path.at(-1);
  if (
    typeof lastKey === "string" &&
    current !== null &&
    typeof current === "object"
  ) {
    (current as Record<string, unknown>)[lastKey] = value;
  }
}

const ADVANCED_SETTINGS = {
  "ollama-host": {
    path: ["hosts", "ollama"],
    type: "input" as const,
    message: "Ollama host URL:",
    getValue: (c: Settings) => c.hosts.ollama,
  },
  "lmstudio-host": {
    path: ["hosts", "lmstudio"],
    type: "input" as const,
    message: "LM Studio host URL:",
    getValue: (c: Settings) => c.hosts.lmstudio,
  },
  "openai-key": {
    path: ["apiKeys", "openai"],
    type: "password" as const,
    message: "OpenAI API key:",
    getValue: (c: Settings) => c.apiKeys.openai,
  },
  "output-file": {
    path: ["outputFile"],
    type: "input" as const,
    message: "Output file path:",
    getValue: (c: Settings) => c.outputFile,
  },
  "system-prompt": {
    path: ["systemPrompt"],
    type: "input" as const,
    message: "Enter system prompt:",
    getValue: (c: Settings) => c.systemPrompt || "",
    special: true,
  },
} as const;

type AdvancedSettingKey = keyof typeof ADVANCED_SETTINGS;

/**
 * Display current configuration in a readable format
 */
export async function showConfig(): Promise<void> {
  const config = await loadConfig();

  console.log("\n📋 Current Configuration:\n");
  console.log(`  Provider:     ${config.provider}`);

  // Show model based on current provider
  const currentModel =
    config.provider === "auto"
      ? `${config.models.ollama} (ollama) / ${config.models.openai} (openai)`
      : config.models[config.provider];

  console.log(`  Model:        ${currentModel}`);

  // Show provider-specific details
  const providersToShow: Provider[] =
    config.provider === "auto"
      ? ["ollama", "lmstudio", "openai"]
      : [config.provider as Provider];

  for (const p of providersToShow) {
    const meta = PROVIDER_META[p];
    if (meta.hasHost) {
      console.log(`  ${meta.label} Host:  ${config.hosts[p]}`);
    }
    if (meta.hasApiKey) {
      const hasKey = config.apiKeys[p] ? "configured" : "not set";
      console.log(`  ${meta.label} Key:   ${hasKey}`);
    }
  }

  console.log(`  Output File:  ${config.outputFile}`);
  console.log();
}

/**
 * Interactive configuration manager
 */
export async function runInteractiveConfig(): Promise<void> {
  const config = await loadConfig();

  console.log("\n⚙️  Configuration Manager\n");

  const { action } = await enquirer.prompt<{
    action: string;
  }>({
    type: "select",
    name: "action",
    message: "What would you like to do?",
    choices: [
      { name: "view", message: "View current configuration" },
      { name: "provider", message: "Change provider" },
      { name: "model", message: "Change model" },
      { name: "advanced", message: "Advanced settings (hosts, API keys)" },
      { name: "exit", message: "Exit" },
    ],
  });

  switch (action) {
    case "view": {
      await showConfig();
      // Ask if they want to do something else
      const { continueConfig } = await enquirer.prompt<{
        continueConfig: boolean;
      }>({
        type: "confirm",
        name: "continueConfig",
        message: "Continue configuring?",
        initial: false,
      });
      if (continueConfig) {
        await runInteractiveConfig();
      }
      break;
    }

    case "provider":
      await changeProvider(config);
      break;

    case "model":
      await changeModel(config);
      break;

    case "advanced":
      await advancedSettings(config);
      break;

    case "exit":
      console.log("\n👋 Exiting configuration\n");
      break;

    default:
      break;
  }
}

async function changeProvider(config: Settings): Promise<void> {
  console.log(`\nCurrent provider: ${config.provider}\n`);

  const { provider } = (await enquirer.prompt({
    type: "select",
    name: "provider",
    message: "Select provider:",
    // @ts-expect-error - enquirer types don't properly support choices in select prompts
    choices: PROVIDER_CHOICES,
    initial: config.provider,
  })) as { provider: Settings["provider"] };

  config.provider = provider;
  await saveConfig(config);
  console.log(`\n✅ Provider changed to: ${provider}\n`);

  // Ask if they want to configure the model too
  const { configureModel } = await enquirer.prompt<{ configureModel: boolean }>(
    {
      type: "confirm",
      name: "configureModel",
      message: "Would you like to configure the model for this provider?",
      initial: false,
    }
  );

  if (configureModel) {
    await changeModel(config);
  }
}

async function changeModel(config: Settings): Promise<void> {
  // If auto, ask which provider's model to configure
  let targetProvider: Provider =
    config.provider === "auto" ? "ollama" : (config.provider as Provider);

  if (config.provider === "auto") {
    const { whichProvider } = await enquirer.prompt<{
      whichProvider: Provider;
    }>({
      type: "select",
      name: "whichProvider",
      message: "Which provider's model would you like to configure?",
      choices: [
        { name: "ollama", message: "Ollama" },
        { name: "lmstudio", message: "LM Studio" },
        { name: "openai", message: "OpenAI" },
      ],
    });
    targetProvider = whichProvider;
  }

  console.log(
    `\nCurrent ${targetProvider} model: ${config.models[targetProvider]}\n`
  );

  // Show some common models based on provider
  const commonModels = getCommonModels(targetProvider);

  const { modelChoice } = await enquirer.prompt<{ modelChoice: string }>({
    type: "select",
    name: "modelChoice",
    message: `Select ${targetProvider} model:`,
    choices: [
      ...commonModels,
      { name: "custom", message: "Enter custom model name" },
    ],
  });

  let finalModel = modelChoice;

  if (modelChoice === "custom") {
    const { customModel } = await enquirer.prompt<{ customModel: string }>({
      type: "input",
      name: "customModel",
      message: "Enter model name:",
      initial: config.models[targetProvider],
    });
    finalModel = customModel;
  }

  config.models[targetProvider] = finalModel;
  await saveConfig(config);
  console.log(`\n✅ ${targetProvider} model changed to: ${finalModel}\n`);
}

async function advancedSettings(config: Settings): Promise<void> {
  const { setting } = await enquirer.prompt<{ setting: string }>({
    type: "select",
    name: "setting",
    message: "Which setting would you like to change?",
    choices: [
      { name: "ollama-host", message: "Ollama host URL" },
      { name: "lmstudio-host", message: "LM Studio host URL" },
      { name: "openai-key", message: "OpenAI API key" },
      { name: "output-file", message: "Output file path" },
      { name: "system-prompt", message: "System prompt (advanced)" },
      { name: "back", message: "← Back" },
    ],
  });

  if (setting === "back") {
    await runInteractiveConfig();
    return;
  }

  if (setting in ADVANCED_SETTINGS) {
    const key = setting as AdvancedSettingKey;
    const schema = ADVANCED_SETTINGS[key];

    // Special handling for system-prompt
    if (schema.special) {
      const { useCustom } = await enquirer.prompt<{ useCustom: boolean }>({
        type: "confirm",
        name: "useCustom",
        message: "Use custom system prompt?",
        initial: config.systemPrompt !== null,
      });

      if (useCustom) {
        const { value } = await enquirer.prompt<{ value: string }>({
          type: schema.type,
          name: "value",
          message: schema.message,
          initial: schema.getValue(config),
        });
        setPath(config, schema.path, value);
      } else {
        setPath(config, schema.path, null);
      }
    } else {
      // Standard prompt and update
      const { value } = await enquirer.prompt<{ value: string }>({
        type: schema.type,
        name: "value",
        message: schema.message,
        initial: schema.getValue(config),
      });
      setPath(config, schema.path, value);
    }

    await saveConfig(config);
    console.log(`\n✅ ${setting} updated\n`);
  }

  // Ask if they want to configure more
  const { configureMore } = await enquirer.prompt<{ configureMore: boolean }>({
    type: "confirm",
    name: "configureMore",
    message: "Configure more settings?",
    initial: false,
  });

  if (configureMore) {
    await runInteractiveConfig();
  }
}

function getCommonModels(
  provider: Provider
): Array<{ name: string; message: string }> {
  return PROVIDER_META[provider].commonModels;
}

/**
 * Apply runtime overrides to configuration
 */
export function applyOverrides(
  config: Settings,
  overrides: RuntimeOverrides
): Settings {
  const merged = { ...config };

  if (overrides.provider) {
    merged.provider = overrides.provider;
  }

  if (overrides.model && merged.provider !== "auto") {
    // Apply model to the current provider
    merged.models[merged.provider] = overrides.model;
  }

  return merged;
}
