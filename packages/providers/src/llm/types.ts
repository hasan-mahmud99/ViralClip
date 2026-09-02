export interface LLMTextResult {
  text: string;
  usage?: { inputTokens?: number; outputTokens?: number };
  model: string;
}

export interface LLMJsonResult<T> {
  data: T;
  usage?: { inputTokens?: number; outputTokens?: number };
  model: string;
}

export interface LLMProvider {
  readonly kind: string;
  readonly model: string;
  generateText(prompt: string, opts?: { temperature?: number; maxOutputTokens?: number }): Promise<LLMTextResult>;
  generateJson<T>(prompt: string, opts?: { temperature?: number; maxOutputTokens?: number }): Promise<LLMJsonResult<T>>;
}
