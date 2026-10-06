import { LLMAdapter, ParseSplitsInput, ParseSplitsOptions, RawSplitResult } from "./types";
import { GeminiAdapter } from "./adapters/gemini";
import { OpenAIAdapter } from "./adapters/openai";
import { AnthropicAdapter } from "./adapters/anthropic";
import { MockAdapter } from "./adapters/mock";

export class ImageNotSupportedError extends Error {
  constructor(provider: string) {
    super(`Active LLM provider '${provider}' does not support receipt images. Please type your split instructions as text.`);
    this.name = "ImageNotSupportedError";
  }
}

export interface ParseSplitsExecutionResult {
  result: RawSplitResult;
  provider: string;
  model: string;
  latencyMs: number;
}

const ADAPTER_REGISTRY: Record<string, LLMAdapter> = {
  gemini: new GeminiAdapter(),
  openai: new OpenAIAdapter(),
  anthropic: new AnthropicAdapter(),
  mock: new MockAdapter(),
};

export function registerAdapter(name: string, adapter: LLMAdapter) {
  ADAPTER_REGISTRY[name.toLowerCase()] = adapter;
}

export function getAdapter(name: string): LLMAdapter | undefined {
  return ADAPTER_REGISTRY[name.toLowerCase()];
}

function getApiKeyForProvider(provider: string): string | undefined {
  switch (provider.toLowerCase()) {
    case "gemini":
      return process.env.GEMINI_API_KEY;
    case "openai":
      return process.env.OPENAI_API_KEY;
    case "anthropic":
      return process.env.ANTHROPIC_API_KEY;
    case "mock":
      return "mock-key";
    default:
      return undefined;
  }
}

async function executeWithRetry(
  adapter: LLMAdapter,
  input: ParseSplitsInput,
  model: string,
  apiKey: string,
  timeoutMs: number = 25000
): Promise<RawSplitResult> {
  let lastError: any;
  // Maximum of 1 initial attempt + 1 retry (2 attempts total)
  for (let attempt = 1; attempt <= 2; attempt++) {
    try {
      return await adapter.parseSplits(input, model, apiKey, timeoutMs);
    } catch (err) {
      lastError = err;
      if (attempt < 2) {
        // Short pause before the single retry
        await new Promise((res) => setTimeout(res, 500));
      }
    }
  }
  throw lastError;
}

export async function parseSplits(
  input: ParseSplitsInput,
  options?: ParseSplitsOptions
): Promise<ParseSplitsExecutionResult> {
  const primaryProvider = (options?.provider || process.env.LLM_PROVIDER || "mock").toLowerCase();
  const primaryModel = options?.model || process.env.LLM_MODEL || "mock-model";
  const fallbackProvider = (options?.fallbackProvider || process.env.LLM_FALLBACK_PROVIDER || "").toLowerCase();
  const fallbackModel = options?.fallbackModel || process.env.LLM_FALLBACK_MODEL || "";
  const timeoutMs = options?.timeoutMs || 25000;

  const adapter = getAdapter(primaryProvider);
  if (!adapter) {
    throw new Error(`Unsupported LLM provider: '${primaryProvider}'. Registered providers: ${Object.keys(ADAPTER_REGISTRY).join(", ")}`);
  }

  // Check image support
  if (input.image && !adapter.supportsImages) {
    throw new ImageNotSupportedError(primaryProvider);
  }

  const primaryApiKey = getApiKeyForProvider(primaryProvider);
  if (!primaryApiKey && primaryProvider !== "mock") {
    throw new Error(`API key missing for provider '${primaryProvider}'. Set ${primaryProvider.toUpperCase()}_API_KEY.`);
  }

  const startTime = Date.now();
  let executedProvider = primaryProvider;
  let executedModel = primaryModel;
  let rawResult: RawSplitResult | null = null;
  let success = false;

  try {
    rawResult = await executeWithRetry(adapter, input, primaryModel, primaryApiKey || "mock-key", timeoutMs);
    success = true;
  } catch (primaryErr: any) {
    console.warn(`[LLM Registry] Primary provider '${primaryProvider}' failed after retry:`, primaryErr?.message || primaryErr);

    // Try fallback provider if configured
    if (fallbackProvider && fallbackModel) {
      const fallbackAdapter = getAdapter(fallbackProvider);
      if (fallbackAdapter) {
        if (input.image && !fallbackAdapter.supportsImages) {
          throw new ImageNotSupportedError(fallbackProvider);
        }

        const fallbackApiKey = getApiKeyForProvider(fallbackProvider);
        if (fallbackApiKey || fallbackProvider === "mock") {
          console.info(`[LLM Registry] Engaging fallback provider '${fallbackProvider}' (${fallbackModel})...`);
          try {
            rawResult = await executeWithRetry(
              fallbackAdapter,
              input,
              fallbackModel,
              fallbackApiKey || "mock-key",
              timeoutMs
            );
            executedProvider = fallbackProvider;
            executedModel = fallbackModel;
            success = true;
          } catch (fallbackErr: any) {
            console.error(`[LLM Registry] Fallback provider '${fallbackProvider}' also failed:`, fallbackErr?.message || fallbackErr);
            throw fallbackErr;
          }
        }
      }
    }

    if (!rawResult) {
      throw primaryErr;
    }
  } finally {
    const latencyMs = Date.now() - startTime;
    // Log metrics ONLY: provider, model, latency, and status. NEVER log content, images, or keys!
    console.info(`[LLM Metrics] provider=${executedProvider} model=${executedModel} latency_ms=${latencyMs} success=${success}`);
  }

  return {
    result: rawResult,
    provider: executedProvider,
    model: executedModel,
    latencyMs: Date.now() - startTime,
  };
}
