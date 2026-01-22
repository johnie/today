import { buildApplication, buildCommand } from "@stricli/core";
import { PROVIDER_VALUES, type ProviderOrAuto } from "@/config";
import type { RuntimeOverrides } from "@/config-manager";
import {
  runConfigCommand,
  runSetupCommand,
  runShowConfigCommand,
  runTodayCommand,
} from "@/impl";

const todayCommand = buildCommand({
  parameters: {
    positional: {
      kind: "tuple",
      parameters: [],
    },
    flags: {
      setup: {
        kind: "boolean",
        brief: "Run the configuration setup wizard",
        default: false,
      },
      config: {
        kind: "boolean",
        brief: "Interactive configuration manager",
        default: false,
      },
      "show-config": {
        kind: "boolean",
        brief: "Display current configuration",
        default: false,
      },
      provider: {
        kind: "enum",
        values: PROVIDER_VALUES as unknown as [
          "auto",
          "ollama",
          "lmstudio",
          "openai",
        ],
        brief: "Override LLM provider for this run (does not save)",
        optional: true,
      },
      model: {
        kind: "parsed",
        parse: String,
        brief: "Override model for this run (does not save)",
        optional: true,
      },
    },
  },
  docs: {
    brief: "Refine your daily intentions with AI",
  },
  func: (flags: {
    setup: boolean;
    config: boolean;
    "show-config": boolean;
    provider?: ProviderOrAuto;
    model?: string;
  }) => {
    const COMMANDS: Record<string, () => Promise<void>> = {
      setup: runSetupCommand,
      config: runConfigCommand,
      "show-config": runShowConfigCommand,
    };

    for (const [flag, handler] of Object.entries(COMMANDS)) {
      if (flags[flag as keyof typeof flags]) {
        return handler();
      }
    }

    const overrides: RuntimeOverrides = {};
    if (flags.provider !== undefined) {
      overrides.provider = flags.provider;
    }
    if (flags.model !== undefined) {
      overrides.model = flags.model;
    }

    return runTodayCommand(overrides);
  },
});

export const app = buildApplication(todayCommand, {
  name: "today",
  versionInfo: {
    currentVersion: "1.0.0",
  },
});
