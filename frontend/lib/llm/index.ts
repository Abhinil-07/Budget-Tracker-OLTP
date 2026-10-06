import { parseSplits as registryParseSplits } from "./registry";
import { ParseSplitsInput, RawSplitResult } from "./types";

export * from "./types";
export { ImageNotSupportedError } from "./registry";

/**
 * Public LLM Interface:
 * Parses a split instruction or receipt image into raw proposed splits.
 * Nothing outside lib/llm/ imports provider SDKs or model names.
 */
export async function parseSplits(input: ParseSplitsInput): Promise<RawSplitResult & { parsed_by: string }> {
  const { result, provider, model } = await registryParseSplits(input);
  return {
    ...result,
    parsed_by: `${provider}:${model}`,
  };
}
