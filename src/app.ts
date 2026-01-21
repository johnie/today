import { buildApplication, buildCommand } from "@stricli/core";
import {
  runProviderSwitchCommand,
  runSetupCommand,
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
      ollama: {
        kind: "boolean",
        brief: "Switch to Ollama provider",
        default: false,
      },
      lmstudio: {
        kind: "boolean",
        brief: "Switch to LM Studio provider",
        default: false,
      },
      openai: {
        kind: "boolean",
        brief: "Switch to OpenAI provider",
        default: false,
      },
      auto: {
        kind: "boolean",
        brief: "Switch to auto-detection (tries all providers)",
        default: false,
      },
    },
  },
  docs: {
    brief: "Refine your daily intentions with AI",
  },
  func: (flags) => {
    if (flags.setup) {
      return runSetupCommand();
    }
    if (flags.ollama) {
      return runProviderSwitchCommand("ollama");
    }
    if (flags.lmstudio) {
      return runProviderSwitchCommand("lmstudio");
    }
    if (flags.openai) {
      return runProviderSwitchCommand("openai");
    }
    if (flags.auto) {
      return runProviderSwitchCommand("auto");
    }
    return runTodayCommand();
  },
});

export const app = buildApplication(todayCommand, {
  name: "today",
  versionInfo: {
    currentVersion: "1.0.0",
  },
});
