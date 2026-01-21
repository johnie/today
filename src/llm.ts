import { createOpenAI } from "@ai-sdk/openai";
import { createOpenAICompatible } from "@ai-sdk/openai-compatible";
import { generateText } from "ai";
import { createOllama } from "ollama-ai-provider-v2";
import type { Settings } from "@/config";

const DEFAULT_SYSTEM_PROMPT = `Refine the user's intention into this exact format:

Today will be a good day if: [one specific outcome]
I will do this by: [one concrete action]
Everything else can wait.

Be concise and actionable. Keep it focused on a single goal. It is important that you only output what is defined in the template above without any additional commentary or explanation.`;

// Provider factory functions
function createProviders(settings: Settings) {
  return {
    ollama: createOllama({ baseURL: `${settings.hosts.ollama}/api` }),
    lmstudio: createOpenAICompatible({
      name: "lmstudio",
      baseURL: `${settings.hosts.lmstudio}/v1`,
    }),
    openai: createOpenAI({ apiKey: settings.apiKeys.openai }),
  };
}

async function detectProvider(settings: Settings): Promise<{
  provider: "ollama" | "lmstudio" | "openai" | null;
  host?: string;
}> {
  // Try Ollama first
  try {
    const response = await fetch(`${settings.hosts.ollama}/api/tags`, {
      method: "GET",
    });
    if (response.ok) {
      return { provider: "ollama", host: settings.hosts.ollama };
    }
  } catch {
    // Ollama not available
  }

  // Try LM Studio
  try {
    const response = await fetch(`${settings.hosts.lmstudio}/v1/models`, {
      method: "GET",
    });
    if (response.ok) {
      return { provider: "lmstudio", host: settings.hosts.lmstudio };
    }
  } catch {
    // LM Studio not available
  }

  // Try OpenAI if key is available
  if (settings.apiKeys.openai) {
    return { provider: "openai" };
  }

  return { provider: null };
}

async function generate(
  provider: ReturnType<typeof createProviders>,
  providerName: "ollama" | "lmstudio" | "openai",
  settings: Settings,
  userInput: string
): Promise<string> {
  const systemPrompt = settings.systemPrompt || DEFAULT_SYSTEM_PROMPT;

  // Get the appropriate model name based on provider
  const modelName = settings.models[providerName];

  // Get the provider instance and create the model
  const providerInstance = provider[providerName];
  const model = providerInstance(modelName);

  const { text } = await generateText({
    model,
    system: systemPrompt,
    prompt: userInput,
  });

  return text.trim();
}

function formatError(error: unknown, provider: string): string {
  if (error && typeof error === "object" && "message" in error) {
    return `${provider} error: ${error.message}`;
  }
  return `${provider} error: Unknown error occurred`;
}

export async function refineIntention(
  userInput: string,
  settings: Settings
): Promise<{ refined: string; provider: string | null }> {
  const providers = createProviders(settings);

  // Handle explicit provider selection
  if (settings.provider === "ollama") {
    try {
      const refined = await generate(providers, "ollama", settings, userInput);
      return { refined, provider: "ollama" };
    } catch (error) {
      throw new Error(formatError(error, "Ollama"));
    }
  }

  if (settings.provider === "lmstudio") {
    try {
      const refined = await generate(
        providers,
        "lmstudio",
        settings,
        userInput
      );
      return { refined, provider: "lm-studio" };
    } catch (error) {
      throw new Error(formatError(error, "LM Studio"));
    }
  }

  if (settings.provider === "openai") {
    try {
      const refined = await generate(providers, "openai", settings, userInput);
      return { refined, provider: "openai" };
    } catch (error) {
      throw new Error(formatError(error, "OpenAI"));
    }
  }

  // Auto mode: try local first, then OpenAI fallback
  const detected = await detectProvider(settings);

  if (detected.provider === "ollama") {
    try {
      const refined = await generate(providers, "ollama", settings, userInput);
      return { refined, provider: "ollama" };
    } catch (error) {
      console.error("Ollama refinement failed:", error);
    }
  }

  if (detected.provider === "lmstudio") {
    try {
      const refined = await generate(
        providers,
        "lmstudio",
        settings,
        userInput
      );
      return { refined, provider: "lm-studio" };
    } catch (error) {
      console.error("LM Studio refinement failed:", error);
    }
  }

  if (detected.provider === "openai") {
    try {
      const refined = await generate(providers, "openai", settings, userInput);
      return { refined, provider: "openai" };
    } catch (error) {
      console.error("OpenAI refinement failed:", error);
    }
  }

  // All providers failed or unavailable
  throw new Error(
    "No LLM provider available. Please configure a provider or check your settings."
  );
}
