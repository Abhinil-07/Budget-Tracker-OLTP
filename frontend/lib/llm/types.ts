export interface PersonContext {
  id: string;
  user_id?: string;
  name: string;
  is_me: boolean;
  aliases: string[];
}

export interface SplitContext {
  total_paise: number;
  merchant?: string;
  people: PersonContext[];
}

export interface ParseSplitsInput {
  text?: string;
  image?: {
    base64: string;
    mimeType: string;
  };
  context: SplitContext;
}

export interface RawSplitItem {
  person_name: string;
  amount_paise: number;
  category?: string;
  note?: string;
}

export interface RawSplitResult {
  splits: RawSplitItem[];
  reasoning?: string;
}

export interface LLMAdapter {
  name: string;
  supportsImages: boolean;
  parseSplits(input: ParseSplitsInput, model: string, apiKey: string, timeoutMs?: number): Promise<RawSplitResult>;
}

export interface ParseSplitsOptions {
  provider?: string;
  model?: string;
  fallbackProvider?: string;
  fallbackModel?: string;
  timeoutMs?: number;
}
