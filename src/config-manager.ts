import enquirer from "enquirer";
import type { Settings } from "@/config";
import { loadConfig, saveConfig } from "@/config";

export interface RuntimeOverrides {
  provider?: Settings["provider"];
  model?: string;
}

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
  if (config.provider === "ollama" || config.provider === "auto") {
    console.log(`  Ollama Host:  ${config.hosts.ollama}`);
  }
  if (config.provider === "lmstudio" || config.provider === "auto") {
    console.log(`  LM Studio:    ${config.hosts.lmstudio}`);
  }
  if (config.provider === "openai" || config.provider === "auto") {
    const hasKey = config.apiKeys.openai ? "configured" : "not set";
    console.log(`  OpenAI Key:   ${hasKey}`);
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
    choices: [
      { name: "auto", message: "auto (recommended - tries local first)" },
      { name: "ollama", message: "ollama" },
      { name: "lmstudio", message: "lmstudio" },
      { name: "openai", message: "openai" },
    ],
    initial: config.provider,
  })) as { provider: "auto" | "ollama" | "lmstudio" | "openai" };

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
  let targetProvider: "ollama" | "lmstudio" | "openai" =
    config.provider === "auto"
      ? "ollama"
      : (config.provider as "ollama" | "lmstudio" | "openai");

  if (config.provider === "auto") {
    const { whichProvider } = await enquirer.prompt<{
      whichProvider: "ollama" | "lmstudio" | "openai";
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

  switch (setting) {
    case "ollama-host": {
      const { host } = await enquirer.prompt<{ host: string }>({
        type: "input",
        name: "host",
        message: "Ollama host URL:",
        initial: config.hosts.ollama,
      });
      config.hosts.ollama = host;
      await saveConfig(config);
      console.log("\n✅ Ollama host updated\n");
      break;
    }

    case "lmstudio-host": {
      const { host } = await enquirer.prompt<{ host: string }>({
        type: "input",
        name: "host",
        message: "LM Studio host URL:",
        initial: config.hosts.lmstudio,
      });
      config.hosts.lmstudio = host;
      await saveConfig(config);
      console.log("\n✅ LM Studio host updated\n");
      break;
    }

    case "openai-key": {
      const { key } = await enquirer.prompt<{ key: string }>({
        type: "password",
        name: "key",
        message: "OpenAI API key:",
      });
      config.apiKeys.openai = key;
      await saveConfig(config);
      console.log("\n✅ OpenAI API key updated\n");
      break;
    }

    case "output-file": {
      const { file } = await enquirer.prompt<{ file: string }>({
        type: "input",
        name: "file",
        message: "Output file path:",
        initial: config.outputFile,
      });
      config.outputFile = file;
      await saveConfig(config);
      console.log("\n✅ Output file updated\n");
      break;
    }

    case "system-prompt": {
      const { useCustom } = await enquirer.prompt<{ useCustom: boolean }>({
        type: "confirm",
        name: "useCustom",
        message: "Use custom system prompt?",
        initial: config.systemPrompt !== null,
      });

      if (useCustom) {
        const { prompt } = await enquirer.prompt<{ prompt: string }>({
          type: "input",
          name: "prompt",
          message: "Enter system prompt:",
          initial: config.systemPrompt || "",
        });
        config.systemPrompt = prompt;
      } else {
        config.systemPrompt = null;
      }
      await saveConfig(config);
      console.log("\n✅ System prompt updated\n");
      break;
    }

    case "back":
      await runInteractiveConfig();
      return;

    default:
      break;
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
  provider: "ollama" | "lmstudio" | "openai"
): Array<{ name: string; message: string }> {
  switch (provider) {
    case "ollama":
      return [
        { name: "llama3.2", message: "llama3.2" },
        { name: "llama3.1", message: "llama3.1" },
        { name: "llama3", message: "llama3" },
        { name: "mistral", message: "mistral" },
        { name: "phi3", message: "phi3" },
        { name: "gemma2", message: "gemma2" },
      ];

    case "lmstudio":
      return [{ name: "local-model", message: "local-model (default)" }];

    case "openai":
      return [
        { name: "gpt-4o", message: "gpt-4o" },
        { name: "gpt-4o-mini", message: "gpt-4o-mini (recommended)" },
        { name: "gpt-4-turbo", message: "gpt-4-turbo" },
        { name: "gpt-3.5-turbo", message: "gpt-3.5-turbo" },
      ];

    default:
      return [];
  }
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
