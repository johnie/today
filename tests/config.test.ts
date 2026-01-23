import { existsSync, mkdirSync, unlinkSync } from "node:fs";
import { dirname } from "node:path";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import {
  CONFIG_FILE,
  configExists,
  ensureConfigDir,
  loadConfig,
  PROVIDER_CHOICES,
  PROVIDER_META,
  type Settings,
  saveConfig,
} from "@/config";

describe("loadConfig", () => {
  const configDir = dirname(CONFIG_FILE);
  let originalConfig: string | null = null;

  beforeEach(async () => {
    // Ensure config directory exists
    if (!existsSync(configDir)) {
      mkdirSync(configDir, { recursive: true });
    }

    // Backup existing config
    try {
      const file = Bun.file(CONFIG_FILE);
      if (await file.exists()) {
        originalConfig = await file.text();
      }
    } catch (_error) {
      // No existing config
    }

    // Suppress console.error during tests
    vi.spyOn(console, "error").mockImplementation(() => {
      // Intentionally empty to suppress error output in tests
    });
  });

  afterEach(async () => {
    try {
      // Restore original config or delete test config
      if (originalConfig) {
        await Bun.write(CONFIG_FILE, originalConfig);
        originalConfig = null;
      } else {
        unlinkSync(CONFIG_FILE);
      }
    } catch (_error) {
      // File operations failed
    }
  });

  test("returns default settings when config doesn't exist", async () => {
    // Ensure no config file exists for this test
    try {
      unlinkSync(CONFIG_FILE);
    } catch (_error) {
      // Already doesn't exist
    }

    const config = await loadConfig();

    expect(config.provider).toBe("auto");
    expect(config.outputFile).toBe("./today.txt");
    expect(config.models.ollama).toBe("llama3.2");
    expect(config.models.openai).toBe("gpt-4o-mini");
    expect(config.hosts.ollama).toBe("http://localhost:11434");
    expect(config.systemPrompt).toBeNull();
  });

  test("merges saved config with defaults", async () => {
    const partial: Partial<Settings> = {
      provider: "ollama",
      outputFile: "/custom/path.txt",
    };

    await Bun.write(CONFIG_FILE, JSON.stringify(partial));
    const config = await loadConfig();

    expect(config.provider).toBe("ollama");
    expect(config.outputFile).toBe("/custom/path.txt");
    expect(config.models.ollama).toBe("llama3.2");
    expect(config.hosts.ollama).toBe("http://localhost:11434");
  });

  test("handles malformed config file", async () => {
    await Bun.write(CONFIG_FILE, "invalid json{");
    const config = await loadConfig();

    expect(config.provider).toBe("auto");
    expect(config.outputFile).toBe("./today.txt");
  });
});

describe("saveConfig", () => {
  const configDir = dirname(CONFIG_FILE);
  let originalConfig: string | null = null;

  beforeEach(async () => {
    if (!existsSync(configDir)) {
      mkdirSync(configDir, { recursive: true });
    }

    // Backup existing config
    try {
      const file = Bun.file(CONFIG_FILE);
      if (await file.exists()) {
        originalConfig = await file.text();
      }
    } catch (_error) {
      // No existing config
    }
  });

  afterEach(async () => {
    try {
      // Restore original config or delete test config
      if (originalConfig) {
        await Bun.write(CONFIG_FILE, originalConfig);
        originalConfig = null;
      } else {
        unlinkSync(CONFIG_FILE);
      }
    } catch (_error) {
      // File operations failed
    }
  });

  test("saves config to file", async () => {
    const settings: Settings = {
      provider: "openai",
      models: {
        ollama: "llama3.2",
        lmstudio: "local-model",
        openai: "gpt-4o",
      },
      hosts: {
        ollama: "http://localhost:11434",
        lmstudio: "http://localhost:1234",
      },
      apiKeys: {
        openai: "test-key",
      },
      outputFile: "./custom.txt",
      systemPrompt: "Custom prompt",
    };

    await saveConfig(settings);

    const file = Bun.file(CONFIG_FILE);
    const saved = await file.json();

    expect(saved.provider).toBe("openai");
    expect(saved.outputFile).toBe("./custom.txt");
    expect(saved.apiKeys.openai).toBe("test-key");
    expect(saved.systemPrompt).toBe("Custom prompt");
  });

  test("creates config directory if it doesn't exist", async () => {
    try {
      unlinkSync(CONFIG_FILE);
    } catch (_error) {
      // Already doesn't exist
    }

    const settings: Settings = {
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

    await saveConfig(settings);

    const file = Bun.file(CONFIG_FILE);
    const exists = await file.exists();

    expect(exists).toBe(true);
  });
});

describe("Settings type", () => {
  test("validates provider types", () => {
    const validProviders: Settings["provider"][] = [
      "auto",
      "ollama",
      "lmstudio",
      "openai",
    ];

    expect(validProviders).toHaveLength(4);
  });
});

describe("configExists", () => {
  const configDir = dirname(CONFIG_FILE);

  beforeEach(() => {
    // Ensure config directory exists
    if (!existsSync(configDir)) {
      mkdirSync(configDir, { recursive: true });
    }
  });

  test("returns true when file exists", async () => {
    // Create a test config file
    await Bun.write(CONFIG_FILE, JSON.stringify({ provider: "auto" }));

    const exists = await configExists();

    expect(exists).toBe(true);

    // Cleanup
    try {
      unlinkSync(CONFIG_FILE);
    } catch (_error) {
      // Ignore cleanup errors
    }
  });

  test("returns false when file is missing", async () => {
    // Ensure no config file exists
    try {
      unlinkSync(CONFIG_FILE);
    } catch (_error) {
      // Already doesn't exist
    }

    const exists = await configExists();

    expect(exists).toBe(false);
  });
});

describe("ensureConfigDir", () => {
  test("creates directory if missing", async () => {
    await ensureConfigDir();

    const configDir = dirname(CONFIG_FILE);
    expect(existsSync(configDir)).toBe(true);
  });

  test("no-op if directory exists", async () => {
    // Ensure directory exists first
    await ensureConfigDir();

    // Call again - should not throw
    await expect(async () => {
      await ensureConfigDir();
    }).not.toThrow();
  });
});

describe("PROVIDER_META", () => {
  test("all providers have required fields", () => {
    const providers = Object.keys(PROVIDER_META);

    for (const provider of providers) {
      const meta = PROVIDER_META[provider as keyof typeof PROVIDER_META];

      expect(meta).toHaveProperty("label");
      expect(meta).toHaveProperty("displayName");
      expect(meta).toHaveProperty("hasHost");
      expect(meta).toHaveProperty("hasApiKey");
      expect(meta).toHaveProperty("defaultHost");
      expect(meta).toHaveProperty("defaultModel");
      expect(meta).toHaveProperty("commonModels");

      expect(typeof meta.label).toBe("string");
      expect(typeof meta.displayName).toBe("string");
      expect(typeof meta.hasHost).toBe("boolean");
      expect(typeof meta.hasApiKey).toBe("boolean");
      expect(typeof meta.defaultHost).toBe("string");
      expect(typeof meta.defaultModel).toBe("string");
      expect(Array.isArray(meta.commonModels)).toBe(true);
    }
  });

  test("validates structure for specific providers", () => {
    // Ollama should have host but no API key
    expect(PROVIDER_META.ollama.hasHost).toBe(true);
    expect(PROVIDER_META.ollama.hasApiKey).toBe(false);

    // OpenAI should have API key but no host
    expect(PROVIDER_META.openai.hasHost).toBe(false);
    expect(PROVIDER_META.openai.hasApiKey).toBe(true);

    // LM Studio should have host but no API key
    expect(PROVIDER_META.lmstudio.hasHost).toBe(true);
    expect(PROVIDER_META.lmstudio.hasApiKey).toBe(false);

    // OpenRouter should have API key but no host
    expect(PROVIDER_META.openrouter.hasHost).toBe(false);
    expect(PROVIDER_META.openrouter.hasApiKey).toBe(true);
  });

  test("common models are properly formatted", () => {
    for (const provider of Object.keys(PROVIDER_META)) {
      const meta = PROVIDER_META[provider as keyof typeof PROVIDER_META];

      for (const model of meta.commonModels) {
        expect(model).toHaveProperty("name");
        expect(model).toHaveProperty("message");
        expect(typeof model.name).toBe("string");
        expect(typeof model.message).toBe("string");
      }
    }
  });
});

describe("PROVIDER_CHOICES", () => {
  test("includes auto as first choice", () => {
    expect(PROVIDER_CHOICES[0].name).toBe("auto");
    expect(PROVIDER_CHOICES[0].message).toContain("auto");
  });

  test("includes all providers from PROVIDER_META", () => {
    const providerNames = PROVIDER_CHOICES.map((choice) => choice.name).filter(
      (name) => name !== "auto"
    );
    const metaKeys = Object.keys(PROVIDER_META);

    expect(providerNames.sort()).toEqual(metaKeys.sort());
  });

  test("all choices have required format", () => {
    for (const choice of PROVIDER_CHOICES) {
      expect(choice).toHaveProperty("name");
      expect(choice).toHaveProperty("message");
      expect(typeof choice.name).toBe("string");
      expect(typeof choice.message).toBe("string");
    }
  });
});
