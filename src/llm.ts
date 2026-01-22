import { createOpenAI } from "@ai-sdk/openai";
import { createOpenAICompatible } from "@ai-sdk/openai-compatible";
import { createOpenRouter } from "@openrouter/ai-sdk-provider";
import { generateText } from "ai";
import { createOllama } from "ollama-ai-provider-v2";
import type { Provider, Settings } from "@/config";
import { PROVIDER_META } from "@/config";

const DEFAULT_SYSTEM_PROMPT = `Refine the user's intention into this exact format:

Today will be a good day if: [one specific outcome]
I will do this by: [one concrete action]
Everything else can wait.

Be concise and actionable. Keep it focused on a single goal. It is important that you only output what is defined in the template above without any additional commentary or explanation.`;

interface DetectionConfig {
  endpoint?: string;
  check?: (s: Settings) => boolean;
}

const DETECTION_CONFIG: Record<Provider, DetectionConfig> = {
  ollama: { endpoint: "/api/tags" },
  lmstudio: { endpoint: "/v1/models" },
  openai: { check: (s: Settings) => !!s.apiKeys.openai },
  openrouter: { check: (s: Settings) => !!s.apiKeys.openrouter },
};

function createProviders(settings: Settings) {
  return {
    ollama: createOllama({ baseURL: `${settings.hosts.ollama}/api` }),
    lmstudio: createOpenAICompatible({
      name: "lmstudio",
      baseURL: `${settings.hosts.lmstudio}/v1`,
    }),
    openai: createOpenAI({ apiKey: settings.apiKeys.openai }),
    openrouter: createOpenRouter({ apiKey: settings.apiKeys.openrouter }),
  };
}

async function detectProvider(settings: Settings): Promise<{
  provider: Provider | null;
  host?: string;
}> {
  for (const [providerName, config] of Object.entries(DETECTION_CONFIG)) {
    const provider = providerName as Provider;

    if (config.endpoint) {
      const meta = PROVIDER_META[provider];
      if (!meta.hasHost) {
        continue;
      }

      try {
        const host = settings.hosts[provider];
        const response = await fetch(`${host}${config.endpoint}`, {
          method: "GET",
        });
        if (response.ok) {
          return { provider, host };
        }
      } catch {
        // Provider not available
      }
    } else if (config.check?.(settings)) {
      return { provider };
    }
  }

  return { provider: null };
}

async function generate(
  providers: ReturnType<typeof createProviders>,
  providerName: Provider,
  settings: Settings,
  userInput: string
): Promise<string> {
  const systemPrompt = settings.systemPrompt || DEFAULT_SYSTEM_PROMPT;
  const modelName = settings.models[providerName];
  const providerInstance = providers[providerName];
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

async function tryProvider(
  providers: ReturnType<typeof createProviders>,
  providerName: Provider,
  settings: Settings,
  userInput: string,
  throwOnError: boolean
): Promise<{ refined: string; provider: string } | null> {
  try {
    const refined = await generate(
      providers,
      providerName,
      settings,
      userInput
    );
    return { refined, provider: PROVIDER_META[providerName].label };
  } catch (error) {
    if (throwOnError) {
      throw new Error(
        formatError(error, PROVIDER_META[providerName].displayName)
      );
    }
    console.error(
      `${PROVIDER_META[providerName].displayName} refinement failed:`,
      error
    );
    return null;
  }
}

export async function refineIntention(
  userInput: string,
  settings: Settings
): Promise<{ refined: string; provider: string | null }> {
  const providers = createProviders(settings);

  if (settings.provider !== "auto") {
    const result = await tryProvider(
      providers,
      settings.provider,
      settings,
      userInput,
      true
    );
    if (result) {
      return result;
    }
  }

  const detected = await detectProvider(settings);

  if (detected.provider) {
    const result = await tryProvider(
      providers,
      detected.provider,
      settings,
      userInput,
      false
    );
    if (result) {
      return result;
    }
  }

  throw new Error(
    "No LLM provider available. Please configure a provider or check your settings."
  );
}
