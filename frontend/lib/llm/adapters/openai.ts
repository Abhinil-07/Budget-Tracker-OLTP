import { LLMAdapter, ParseSplitsInput, RawSplitResult } from "../types";
import { buildSystemPrompt, buildUserPrompt } from "../prompt";
import { SPLIT_RESULT_JSON_SCHEMA } from "../schema";

export class OpenAIAdapter implements LLMAdapter {
  name = "openai";
  supportsImages = true;

  async parseSplits(
    input: ParseSplitsInput,
    model: string,
    apiKey: string,
    timeoutMs: number = 25000
  ): Promise<RawSplitResult> {
    const systemPrompt = buildSystemPrompt();
    const userPrompt = buildUserPrompt(input.text, input.context, Boolean(input.image));

    const userContent: any[] = [{ type: "text", text: userPrompt }];

    if (input.image) {
      userContent.push({
        type: "image_url",
        image_url: {
          url: `data:${input.image.mimeType};base64,${input.image.base64}`,
        },
      });
    }

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model,
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userContent },
          ],
          response_format: {
            type: "json_schema",
            json_schema: {
              name: "split_result",
              strict: true,
              schema: SPLIT_RESULT_JSON_SCHEMA,
            },
          },
        }),
        signal: controller.signal,
      });

      if (!response.ok) {
        const errText = await response.text();
        throw new Error(`OpenAI API error (${response.status}): ${errText}`);
      }

      const data = await response.json();
      const content = data?.choices?.[0]?.message?.content;
      if (!content) {
        throw new Error("OpenAI returned an empty response content");
      }

      const parsed = JSON.parse(content);
      return {
        splits: parsed.splits || [],
        reasoning: parsed.reasoning,
      };
    } finally {
      clearTimeout(timer);
    }
  }
}
