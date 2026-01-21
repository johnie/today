import enquirer from "enquirer";
import type { Settings } from "@/config";
import { configExists, loadConfig, runSetup, saveConfig } from "@/config";
import { writeTodayFile } from "@/file";
import { refineIntention } from "@/llm";

export async function runTodayCommand(): Promise<void> {
  // Check if config exists, run setup if not
  const config = (await configExists()) ? await loadConfig() : await runSetup();

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
    console.error("  • Review your configuration with the setup command");
    process.exit(1);
  }
}

export async function runSetupCommand(): Promise<void> {
  await runSetup();
}

export async function runProviderSwitchCommand(
  provider: Settings["provider"]
): Promise<void> {
  const config = await loadConfig();
  config.provider = provider;
  await saveConfig(config);
  console.log(`✅ Provider switched to: ${provider}`);
}
