import { ProviderError } from "@viralclip/shared";
import { LLMProvider, LLMTextResult, LLMJsonResult } from "./types";
import { sleep } from "@viralclip/shared";

export interface GeminiConfig {
  apiKey: string;
  model: string;
  maxRetries: number;
  retryBaseMs: number;
}

export class GeminiProvider implements LLMProvider {
  readonly kind = "gemini";
  readonly model: string;
  private readonly config: GeminiConfig;

  constructor(config: GeminiConfig) {
    this.config = config;
    this.model = config.model;
    if (!config.apiKey) {
      throw new ProviderError("GEMINI_MISSING_KEY", "Gemini API key is not configured");
    }
  }

  async generateText(prompt: string, opts?: { temperature?: number; maxOutputTokens?: number }): Promise<LLMTextResult> {
    const body = this.buildBody(prompt, opts);
    const text = await this.call(body);
    return { text, model: this.model };
  }

  async generateJson<T>(prompt: string, opts?: { temperature?: number; maxOutputTokens?: number }): Promise<LLMJsonResult<T>> {
    const result = await this.generateText(prompt, opts);
    const text = result.text.trim().replace(/^```json\s*/i, "").replace(/```$/i, "").trim();
    let data: T;
    try {
      data = JSON.parse(text) as T;
    } catch (e) {
      throw new ProviderError("GEMINI_BAD_JSON", "Gemini returned invalid JSON", { cause: e });
    }
    return { data, model: this.model };
  }

  private buildBody(prompt: string, opts?: { temperature?: number; maxOutputTokens?: number }) {
    return {
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: opts?.temperature ?? 0.4,
        maxOutputTokens: opts?.maxOutputTokens ?? 2048,
        responseMimeType: "application/json",
      },
    };
  }

  private async call(body: unknown, attempt = 0): Promise<string> {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(
      this.model
    )}:generateContent?key=${encodeURIComponent(this.config.apiKey)}`;
    let res: Response;
    try {
      res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
    } catch (e) {
      if (attempt < this.config.maxRetries) {
        await sleep(this.backoffMs(attempt));
        return this.call(body, attempt + 1);
      }
      throw new ProviderError("GEMINI_NETWORK", "Gemini network error", { cause: e, retryable: true });
    }
    if (res.status === 429 || res.status >= 500) {
      if (attempt < this.config.maxRetries) {
        await sleep(this.backoffMs(attempt));
        return this.call(body, attempt + 1);
      }
      throw new ProviderError("GEMINI_RATE_LIMIT", `Gemini HTTP ${res.status}`, { retryable: true });
    }
    if (!res.ok) {
      throw new ProviderError("GEMINI_HTTP", `Gemini HTTP ${res.status}: ${await res.text()}`);
    }
    const json = (await res.json()) as {
      candidates?: { content?: { parts?: { text?: string }[] } }[];
    };
    const text = json.candidates?.[0]?.content?.parts?.map((p) => p.text ?? "").join("") ?? "";
    if (!text) throw new ProviderError("GEMINI_EMPTY", "Gemini returned empty response");
    return text;
  }

  private backoffMs(attempt: number): number {
    return this.config.retryBaseMs * Math.pow(2, attempt) + Math.random() * 200;
  }
}
