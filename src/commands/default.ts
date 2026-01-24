import { buildCommand } from "@stricli/core";
import {
  configExists,
  loadConfig,
  PROVIDER_VALUES,
  type ProviderOrAuto,
  runSetup,
} from "@/config";
import { applyOverrides, type RuntimeOverrides } from "@/config-manager";
import { writeTodayFile } from "@/file";
import { refineIntention } from "@/llm";

export const defaultCommand = buildCommand({
  parameters: {
    positional: {
      kind: "tuple",
      parameters: [],
    },
    flags: {
      provider: {
        kind: "enum",
        values: PROVIDER_VALUES,
        brief: "Override LLM provider for this run (does not save)",
        optional: true,
      },
      model: {
        kind: "parsed",
        parse: String,
        brief: "Override model for this run (does not save)",
        optional: true,
      },
      p: {
        kind: "enum",
        values: PROVIDER_VALUES,
        brief: "Alias for --provider",
        optional: true,
      },
      m: {
        kind: "parsed",
        parse: String,
        brief: "Alias for --model",
        optional: true,
      },
    },
  },
  docs: {
    brief: "Refine your daily intentions with AI",
  },
  func: async (flags: {
    provider?: ProviderOrAuto;
    model?: string;
    p?: ProviderOrAuto;
    m?: string;
  }) => {
    // Check if config exists, run setup if not
    let config = (await configExists()) ? await loadConfig() : await runSetup();

    // Apply runtime overrides if provided
    const overrides: RuntimeOverrides = {};
    const provider = flags.provider ?? flags.p;
    const model = flags.model ?? flags.m;

    if (provider !== undefined) {
      overrides.provider = provider;
    }
    if (model !== undefined) {
      overrides.model = model;
    }

    const hasOverrides = overrides.provider || overrides.model;
    if (hasOverrides) {
      config = applyOverrides(config, overrides);

      // Show what's being used
      console.log("\n🔧 Runtime overrides active:");
      if (overrides.provider) {
        console.log(`   Provider: ${overrides.provider}`);
      }
      if (overrides.model) {
        console.log(`   Model: ${overrides.model}`);
      }
      console.log();
    }

    // Dynamic import of enquirer for lazy loading
    const enquirer = (await import("enquirer")).default;

    const { input } = await enquirer.prompt<{ input: string }>({
      type: "input",
      name: "input",
      message: "What do you want to accomplish today?",
    });

    if (!input.trim()) {
      console.log("No input provided. Exiting.");
      return;
    }

    try {
      const { refined, provider } = await refineIntention(input, config);

      if (provider) {
        console.log(`\nRefining with ${provider}...\n`);
      }

      console.log(refined);

      await writeTodayFile(refined, config.outputFile);

      console.log(`\nSaved to ${config.outputFile}`);
    } catch (error) {
      console.error(
        "\n❌ Error:",
        error instanceof Error ? error.message : String(error)
      );
      console.error("\nFile was not created due to the error above.");
      console.error("\nTroubleshooting tips:");
      console.error(
        "  • Check if the specified model exists in your LLM provider"
      );
      console.error("  • Verify that your LLM provider is running");
      console.error("  • Review your configuration with: today config show");
      console.error("  • Run interactive config: today config");
      process.exit(1);
    }
  },
});
