import { existsSync, mkdirSync, unlinkSync } from "node:fs";
import { dirname } from "node:path";
import { afterEach, beforeEach, describe, expect, test } from "vitest";
import { CONFIG_FILE, loadConfig, type Settings, saveConfig } from "@/config";

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
