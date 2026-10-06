import { LLMAdapter, ParseSplitsInput, RawSplitResult } from "../types";
import { buildSystemPrompt, buildUserPrompt } from "../prompt";
import { SPLIT_RESULT_JSON_SCHEMA } from "../schema";

export class AnthropicAdapter implements LLMAdapter {
  name = "anthropic";
  supportsImages = true;

  async parseSplits(
    input: ParseSplitsInput,
    model: string,
    apiKey: string,
    timeoutMs: number = 25000
  ): Promise<RawSplitResult> {
    const systemPrompt = buildSystemPrompt();
    const userPrompt = buildUserPrompt(input.text, input.context, Boolean(input.image));

    const content: any[] = [];

    if (input.image) {
      content.push({
        type: "image",
        source: {
          type: "base64",
          media_type: input.image.mimeType,
          data: input.image.base64,
        },
      });
    }

    content.push({ type: "text", text: userPrompt });

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": apiKey,
          "anthropic-version": "2023-06-01",
        },
        body: JSON.stringify({
          model,
          max_tokens: 1024,
          system: systemPrompt,
          messages: [{ role: "user", content }],
          tools: [
            {
              name: "record_splits",
              description: "Record the expense splits per person according to user instruction and receipt",
              input_schema: SPLIT_RESULT_JSON_SCHEMA,
            },
          ],
          tool_choice: { type: "tool", name: "record_splits" },
        }),
        signal: controller.signal,
      });

      if (!response.ok) {
        const errText = await response.text();
        throw new Error(`Anthropic API error (${response.status}): ${errText}`);
      }

      const data = await response.json();
      const toolUseBlock = data?.content?.find((c: any) => c.type === "tool_use");
      if (!toolUseBlock || !toolUseBlock.input) {
        throw new Error("Anthropic did not call the record_splits tool");
      }

      const result = toolUseBlock.input;
      return {
        splits: result.splits || [],
        reasoning: result.reasoning,
      };
    } finally {
      clearTimeout(timer);
    }
  }
}
