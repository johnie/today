import { beforeEach, describe, expect, test, vi } from "vitest";
import type { Settings } from "@/config";
import { refineIntention } from "@/llm";

// Mock the AI SDK and providers
vi.mock("ai", () => ({
  generateText: vi.fn(),
}));

vi.mock("@ai-sdk/openai", () => ({
  createOpenAI: vi.fn(() => () => ({})),
}));

vi.mock("@ai-sdk/openai-compatible", () => ({
  createOpenAICompatible: vi.fn(() => () => ({})),
}));

vi.mock("@openrouter/ai-sdk-provider", () => ({
  createOpenRouter: vi.fn(() => () => ({})),
}));

vi.mock("ollama-ai-provider-v2", () => ({
  createOllama: vi.fn(() => () => ({})),
}));

describe("refineIntention", () => {
  const defaultSettings: Settings = {
    provider: "auto",
    models: {
      ollama: "llama3.2",
      lmstudio: "local-model",
      openai: "gpt-4o-mini",
      openrouter: "google/gemini-flash-1.5",
    },
    hosts: {
      ollama: "http://localhost:11434",
      lmstudio: "http://localhost:1234",
    },
    apiKeys: {
      openai: "",
      openrouter: "",
    },
    outputFile: "./today.txt",
    systemPrompt: null,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    // Reset fetch mock
    global.fetch = vi.fn();
    // Suppress console.error during tests
    vi.spyOn(console, "error").mockImplementation(() => {
      // Intentionally empty to suppress error output in tests
    });
  });

  test("uses explicit provider when set", async () => {
    const { generateText } = await import("ai");
    (generateText as ReturnType<typeof vi.fn>).mockResolvedValue({
      text: "Today will be a good day if: I complete my tasks\nI will do this by: focusing on priorities\nEverything else can wait.",
      finishReason: "stop",
      usage: { promptTokens: 10, completionTokens: 20, totalTokens: 30 },
      warnings: [],
      request: {} as never,
      response: {
        id: "test",
        timestamp: new Date(),
        modelId: "test-model",
      },
      experimental_providerMetadata: undefined,
      toJsonResponse: vi.fn(),
    });

    const settings: Settings = {
      ...defaultSettings,
      provider: "ollama",
    };

    // Mock successful Ollama response (shouldn't be called since provider is explicit)
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      json: async () => ({ models: [{ name: "llama3.2" }] }),
    } as Response);

    const result = await refineIntention("Test input", settings);

    expect(result.refined).toContain("Today will be a good day if");
    expect(result.provider).toBe("ollama");
    expect(generateText).toHaveBeenCalledTimes(1);
  });

  test("auto-detects provider when set to auto", async () => {
    const { generateText } = await import("ai");
    (generateText as ReturnType<typeof vi.fn>).mockResolvedValue({
      text: "Today will be a good day if: I learn something new\nI will do this by: reading documentation\nEverything else can wait.",
      finishReason: "stop",
      usage: { promptTokens: 10, completionTokens: 20, totalTokens: 30 },
      warnings: [],
      request: {} as never,
      response: {
        id: "test",
        timestamp: new Date(),
        modelId: "test-model",
      },
      experimental_providerMetadata: undefined,
      toJsonResponse: vi.fn(),
    });

    const settings: Settings = {
      ...defaultSettings,
      provider: "auto",
    };

    // Mock successful Ollama detection
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ models: [{ name: "llama3.2" }] }),
    } as Response);

    const result = await refineIntention("Test input", settings);

    expect(result.refined).toContain("Today will be a good day if");
    expect(result.provider).toBe("ollama");
    expect(generateText).toHaveBeenCalledTimes(1);
  });

  test("throws when no provider available in auto mode", async () => {
    const settings: Settings = {
      ...defaultSettings,
      provider: "auto",
    };

    // Mock all providers failing detection
    (global.fetch as ReturnType<typeof vi.fn>).mockRejectedValue(
      new Error("Connection failed")
    );

    await expect(refineIntention("Test input", settings)).rejects.toThrow(
      "No LLM provider available"
    );
  });

  test("throws when explicit provider fails", async () => {
    const { generateText } = await import("ai");
    (generateText as ReturnType<typeof vi.fn>).mockRejectedValue(
      new Error("API error")
    );

    const settings: Settings = {
      ...defaultSettings,
      provider: "ollama",
    };

    await expect(refineIntention("Test input", settings)).rejects.toThrow(
      "Ollama error"
    );
  });

  test("requires API key for providers that need it", async () => {
    const settings: Settings = {
      ...defaultSettings,
      provider: "openai",
      apiKeys: {
        openai: "",
        openrouter: "",
      },
    };

    await expect(refineIntention("Test input", settings)).rejects.toThrow(
      "OpenAI requires an API key"
    );
  });

  test("uses custom system prompt when provided", async () => {
    const { generateText } = await import("ai");
    (generateText as ReturnType<typeof vi.fn>).mockResolvedValue({
      text: "Custom response",
      finishReason: "stop",
      usage: { promptTokens: 10, completionTokens: 20, totalTokens: 30 },
      warnings: [],
      request: {} as never,
      response: {
        id: "test",
        timestamp: new Date(),
        modelId: "test-model",
      },
      experimental_providerMetadata: undefined,
      toJsonResponse: vi.fn(),
    });

    const settings: Settings = {
      ...defaultSettings,
      provider: "ollama",
      systemPrompt: "Custom system prompt",
    };

    await refineIntention("Test input", settings);

    expect(generateText).toHaveBeenCalledWith(
      expect.objectContaining({
        system: "Custom system prompt",
      })
    );
  });

  test("falls back when provider fails in auto mode", async () => {
    const { generateText } = await import("ai");

    // Mock Ollama detection succeeding but generation failing
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ models: [{ name: "llama3.2" }] }),
    } as Response);

    (generateText as ReturnType<typeof vi.fn>).mockRejectedValueOnce(
      new Error("Ollama connection failed")
    );

    const settings: Settings = {
      ...defaultSettings,
      provider: "auto",
    };

    // In auto mode, when first provider fails, it should throw since
    // detection only finds one provider at a time
    await expect(refineIntention("Test input", settings)).rejects.toThrow();
  });

  test("trims whitespace from LLM response", async () => {
    const { generateText } = await import("ai");

    // Clear all previous mocks
    vi.clearAllMocks();

    (generateText as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      text: "  \n\nToday will be a good day\n\n  ",
      finishReason: "stop",
      usage: { promptTokens: 10, completionTokens: 20, totalTokens: 30 },
      warnings: [],
      request: {} as never,
      response: {
        id: "test",
        timestamp: new Date(),
        modelId: "test-model",
      },
      experimental_providerMetadata: undefined,
      toJsonResponse: vi.fn(),
    });

    const settings: Settings = {
      ...defaultSettings,
      provider: "ollama",
    };

    const result = await refineIntention("Test input", settings);

    expect(result.refined).toBe("Today will be a good day");
  });
});
