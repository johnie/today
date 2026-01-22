import enquirer from "enquirer";
import { configExists, loadConfig, runSetup } from "@/config";
import {
  applyOverrides,
  type RuntimeOverrides,
  runInteractiveConfig,
  showConfig,
} from "@/config-manager";
import { writeTodayFile } from "@/file";
import { refineIntention } from "@/llm";

export async function runTodayCommand(
  overrides: RuntimeOverrides = {}
): Promise<void> {
  // Check if config exists, run setup if not
  let config = (await configExists()) ? await loadConfig() : await runSetup();

  // Apply runtime overrides if provided
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
    console.error("  • Review your configuration with: today --show-config");
    console.error("  • Run interactive config: today --config");
    process.exit(1);
  }
}

export async function runSetupCommand(): Promise<void> {
  await runSetup();
}

export async function runConfigCommand(): Promise<void> {
  await runInteractiveConfig();
}

export async function runShowConfigCommand(): Promise<void> {
  await showConfig();
}
