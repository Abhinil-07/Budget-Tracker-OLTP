import { LLMAdapter, ParseSplitsInput, RawSplitResult } from "../types";
import { buildSystemPrompt, buildUserPrompt } from "../prompt";
import { SPLIT_RESULT_JSON_SCHEMA } from "../schema";

export class GeminiAdapter implements LLMAdapter {
  name = "gemini";
  supportsImages = true;

  async parseSplits(
    input: ParseSplitsInput,
    model: string,
    apiKey: string,
    timeoutMs: number = 25000
  ): Promise<RawSplitResult> {
    const systemPrompt = buildSystemPrompt();
    const userPrompt = buildUserPrompt(input.text, input.context, Boolean(input.image));

    const parts: any[] = [{ text: `${systemPrompt}\n\n${userPrompt}` }];

    if (input.image) {
      parts.push({
        inlineData: {
          mimeType: input.image.mimeType,
          data: input.image.base64,
        },
      });
    }

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          contents: [{ parts }],
          generationConfig: {
            responseMimeType: "application/json",
            responseSchema: SPLIT_RESULT_JSON_SCHEMA,
          },
        }),
        signal: controller.signal,
      });

      if (!response.ok) {
        const errText = await response.text();
        throw new Error(`Gemini API error (${response.status}): ${errText}`);
      }

      const data = await response.json();
      const rawText = data?.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!rawText) {
        throw new Error("Gemini returned an empty response content");
      }

      const parsed = JSON.parse(rawText);
      return {
        splits: parsed.splits || [],
        reasoning: parsed.reasoning,
      };
    } finally {
      clearTimeout(timer);
    }
  }
}
