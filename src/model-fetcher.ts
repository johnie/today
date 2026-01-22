import type { Provider, Settings } from "@/config";

const FETCH_TIMEOUT = 5000; // 5 seconds

interface OllamaResponse {
  models: Array<{ name: string }>;
}

interface LMStudioResponse {
  data: Array<{ id: string }>;
}

interface OpenAIResponse {
  data: Array<{ id: string }>;
}

interface OpenRouterResponse {
  data: Array<{ id: string; name: string }>;
}

/**
 * Fetch available models from Ollama
 */
export async function fetchOllamaModels(host: string): Promise<string[]> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT);

    const response = await fetch(`${host}/api/tags`, {
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    if (!response.ok) {
      return [];
    }

    const data = (await response.json()) as OllamaResponse;
    return data.models.map((m) => m.name);
  } catch (_error) {
    return [];
  }
}

/**
 * Fetch available models from LM Studio
 */
export async function fetchLMStudioModels(host: string): Promise<string[]> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT);

    const response = await fetch(`${host}/v1/models`, {
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    if (!response.ok) {
      return [];
    }

    const data = (await response.json()) as LMStudioResponse;
    return data.data.map((m) => m.id);
  } catch (_error) {
    return [];
  }
}

/**
 * Fetch available models from OpenAI, filtering to text generation models only
 */
export async function fetchOpenAIModels(apiKey: string): Promise<string[]> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT);

    const response = await fetch("https://api.openai.com/v1/models", {
      headers: {
        Authorization: `Bearer ${apiKey}`,
      },
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    if (!response.ok) {
      return [];
    }

    const data = (await response.json()) as OpenAIResponse;

    // Filter to only GPT models (exclude whisper, dall-e, tts, embeddings, etc.)
    return data.data
      .filter((m) => m.id.startsWith("gpt-"))
      .map((m) => m.id)
      .sort();
  } catch (_error) {
    return [];
  }
}

/**
 * Fetch available models from OpenRouter, filtering to popular providers
 */
export async function fetchOpenRouterModels(apiKey: string): Promise<string[]> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT);

    const response = await fetch("https://openrouter.ai/api/v1/models", {
      headers: apiKey ? { Authorization: `Bearer ${apiKey}` } : {},
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    if (!response.ok) {
      return [];
    }

    const data = (await response.json()) as OpenRouterResponse;

    // Filter to popular providers to avoid overwhelming users with 300+ models
    const popularPrefixes = [
      "google/",
      "anthropic/",
      "openai/",
      "meta-llama/",
      "deepseek/",
      "cohere/",
      "mistralai/",
      "amazon/",
    ];

    return data.data
      .filter((m) => popularPrefixes.some((prefix) => m.id.startsWith(prefix)))
      .map((m) => m.id)
      .sort();
  } catch (_error) {
    return [];
  }
}

/**
 * Fetch models for a specific provider based on current settings
 */
export async function fetchModelsForProvider(
  provider: Provider,
  settings: Settings
): Promise<string[]> {
  switch (provider) {
    case "ollama":
      return await fetchOllamaModels(settings.hosts.ollama);
    case "lmstudio":
      return await fetchLMStudioModels(settings.hosts.lmstudio);
    case "openai":
      return settings.apiKeys.openai
        ? await fetchOpenAIModels(settings.apiKeys.openai)
        : [];
    case "openrouter":
      return settings.apiKeys.openrouter
        ? await fetchOpenRouterModels(settings.apiKeys.openrouter)
        : [];
    default:
      return [];
  }
}
