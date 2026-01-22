import { homedir } from "node:os";
import { join } from "node:path";
import enquirer from "enquirer";

export const PROVIDER_META = {
  ollama: {
    label: "ollama",
    hasHost: true,
    hasApiKey: false,
    defaultHost: "http://localhost:11434",
    defaultModel: "llama3.2",
    commonModels: [
      { name: "llama3.2", message: "llama3.2" },
      { name: "llama3.1", message: "llama3.1" },
      { name: "llama3", message: "llama3" },
      { name: "mistral", message: "mistral" },
      { name: "phi3", message: "phi3" },
      { name: "gemma2", message: "gemma2" },
    ],
  },
  lmstudio: {
    label: "lmstudio",
    hasHost: true,
    hasApiKey: false,
    defaultHost: "http://localhost:1234",
    defaultModel: "local-model",
    commonModels: [{ name: "local-model", message: "local-model (default)" }],
  },
  openai: {
    label: "openai",
    hasHost: false,
    hasApiKey: true,
    defaultHost: "",
    defaultModel: "gpt-4o-mini",
    commonModels: [
      { name: "gpt-4o", message: "gpt-4o" },
      { name: "gpt-4o-mini", message: "gpt-4o-mini (recommended)" },
      { name: "gpt-4-turbo", message: "gpt-4-turbo" },
      { name: "gpt-3.5-turbo", message: "gpt-3.5-turbo" },
    ],
  },
} as const;

export type Provider = keyof typeof PROVIDER_META;
export const PROVIDERS = Object.keys(PROVIDER_META) as Provider[];

export type ProviderOrAuto = Provider | "auto";

export const PROVIDER_CHOICES: Array<{
  name: ProviderOrAuto;
  message: string;
}> = [
  { name: "auto", message: "auto (recommended - tries local first)" },
  { name: "ollama", message: "ollama" },
  { name: "lmstudio", message: "lmstudio" },
  { name: "openai", message: "openai" },
];

export const PROVIDER_VALUES: readonly ProviderOrAuto[] = [
  "auto",
  "ollama",
  "lmstudio",
  "openai",
] as const;

export interface Settings {
  provider: ProviderOrAuto;
  models: {
    ollama: string;
    lmstudio: string;
    openai: string;
  };
  hosts: {
    ollama: string;
    lmstudio: string;
  };
  apiKeys: {
    openai: string;
  };
  outputFile: string;
  systemPrompt: string | null;
}

const DEFAULT_SETTINGS: Settings = {
  provider: "auto",
  models: {
    ollama: PROVIDER_META.ollama.defaultModel,
    lmstudio: PROVIDER_META.lmstudio.defaultModel,
    openai: PROVIDER_META.openai.defaultModel,
  },
  hosts: {
    ollama: PROVIDER_META.ollama.defaultHost,
    lmstudio: PROVIDER_META.lmstudio.defaultHost,
  },
  apiKeys: {
    openai: "",
  },
  outputFile: "./today.txt",
  systemPrompt: null,
};

export const CONFIG_DIR = join(homedir(), ".today");
export const CONFIG_FILE = join(CONFIG_DIR, "settings.json");

export async function configExists(): Promise<boolean> {
  const file = Bun.file(CONFIG_FILE);
  return await file.exists();
}

export async function ensureConfigDir(): Promise<void> {
  try {
    await Bun.write(join(CONFIG_DIR, ".keep"), "");
  } catch (_error) {
    // Directory creation handled by Bun.write
  }
}

export async function loadConfig(): Promise<Settings> {
  const file = Bun.file(CONFIG_FILE);
  const exists = await file.exists();

  if (!exists) {
    return DEFAULT_SETTINGS;
  }

  try {
    const content = await file.json();
    return { ...DEFAULT_SETTINGS, ...content };
  } catch (_error) {
    console.error("Failed to parse config file, using defaults");
    return DEFAULT_SETTINGS;
  }
}

export async function saveConfig(settings: Settings): Promise<void> {
  await ensureConfigDir();
  await Bun.write(CONFIG_FILE, JSON.stringify(settings, null, 2));
}

export async function runSetup(): Promise<Settings> {
  console.log("\n🎯 Welcome to today! Let's set up your configuration.\n");

  const { provider } = await enquirer.prompt<{ provider: ProviderOrAuto }>({
    type: "select",
    name: "provider",
    message: "Select your preferred LLM provider:",
    choices: PROVIDER_CHOICES,
  });

  const settings: Settings = { ...DEFAULT_SETTINGS, provider };

  // Configure provider-specific settings
  const providersToSetup: Provider[] =
    provider === "auto" ? PROVIDERS : [provider];

  for (const p of providersToSetup) {
    const meta = PROVIDER_META[p];

    // Configure host if applicable
    if (meta.hasHost) {
      const { value } = await enquirer.prompt<{ value: string }>({
        type: "input",
        name: "value",
        message: `${meta.label} host URL:`,
        initial: meta.defaultHost,
      });
      settings.hosts[p] = value;
    }

    // Configure API key if applicable
    if (meta.hasApiKey) {
      const { value } = await enquirer.prompt<{ value: string }>({
        type: "password",
        name: "value",
        message: `${meta.label} API key (leave empty to skip):`,
      });
      settings.apiKeys[p] = value;

      // Only prompt for model if API key provided
      if (!value) {
        continue;
      }
    }

    // Configure model
    const { value: model } = await enquirer.prompt<{ value: string }>({
      type: "input",
      name: "value",
      message: `${meta.label} model name:`,
      initial: meta.defaultModel,
    });
    settings.models[p] = model;
  }

  const { outputFile } = await enquirer.prompt<{ outputFile: string }>({
    type: "input",
    name: "outputFile",
    message: "Output file path:",
    initial: DEFAULT_SETTINGS.outputFile,
  });
  settings.outputFile = outputFile;

  await saveConfig(settings);
  console.log(`\n✅ Configuration saved to ${CONFIG_FILE}\n`);

  return settings;
}
