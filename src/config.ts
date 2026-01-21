import { homedir } from "node:os";
import { join } from "node:path";
import enquirer from "enquirer";

export interface Settings {
  provider: "auto" | "ollama" | "lmstudio" | "openai";
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
    ollama: "llama3.2",
    lmstudio: "local-model",
    openai: "gpt-4o-mini",
  },
  hosts: {
    ollama: "http://localhost:11434",
    lmstudio: "http://localhost:1234",
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

  const { provider } = await enquirer.prompt<{
    provider: "auto" | "ollama" | "lmstudio" | "openai";
  }>({
    type: "select",
    name: "provider",
    message: "Select your preferred LLM provider:",
    choices: [
      { name: "auto", message: "auto (recommended - tries local first)" },
      { name: "ollama", message: "ollama" },
      { name: "lmstudio", message: "lmstudio" },
      { name: "openai", message: "openai" },
    ],
  });

  const settings: Settings = { ...DEFAULT_SETTINGS, provider };

  // Configure provider-specific settings
  if (provider === "ollama" || provider === "auto") {
    const { ollamaHost } = await enquirer.prompt<{ ollamaHost: string }>({
      type: "input",
      name: "ollamaHost",
      message: "Ollama host URL:",
      initial: DEFAULT_SETTINGS.hosts.ollama,
    });
    settings.hosts.ollama = ollamaHost;

    const { ollamaModel } = await enquirer.prompt<{ ollamaModel: string }>({
      type: "input",
      name: "ollamaModel",
      message: "Ollama model name:",
      initial: DEFAULT_SETTINGS.models.ollama,
    });
    settings.models.ollama = ollamaModel;
  }

  if (provider === "lmstudio" || provider === "auto") {
    const { lmstudioHost } = await enquirer.prompt<{ lmstudioHost: string }>({
      type: "input",
      name: "lmstudioHost",
      message: "LM Studio host URL:",
      initial: DEFAULT_SETTINGS.hosts.lmstudio,
    });
    settings.hosts.lmstudio = lmstudioHost;

    const { lmstudioModel } = await enquirer.prompt<{ lmstudioModel: string }>({
      type: "input",
      name: "lmstudioModel",
      message: "LM Studio model name:",
      initial: DEFAULT_SETTINGS.models.lmstudio,
    });
    settings.models.lmstudio = lmstudioModel;
  }

  if (provider === "openai" || provider === "auto") {
    const { openaiKey } = await enquirer.prompt<{ openaiKey: string }>({
      type: "password",
      name: "openaiKey",
      message: "OpenAI API key (leave empty to skip):",
    });
    settings.apiKeys.openai = openaiKey;

    if (openaiKey) {
      const { openaiModel } = await enquirer.prompt<{ openaiModel: string }>({
        type: "input",
        name: "openaiModel",
        message: "OpenAI model name:",
        initial: DEFAULT_SETTINGS.models.openai,
      });
      settings.models.openai = openaiModel;
    }
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
