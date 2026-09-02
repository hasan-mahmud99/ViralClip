import { LLMProvider, LLMTextResult, LLMJsonResult } from "./types";

export interface MockRouter {
  (prompt: string): unknown;
}

export class MockLLMProvider implements LLMProvider {
  readonly kind = "mock";
  readonly model = "mock-llm";
  constructor(private readonly router: MockRouter) {}

  async generateText(_prompt: string): Promise<LLMTextResult> {
    const data = this.router("text") ?? { text: "" };
    return { text: typeof data === "string" ? data : JSON.stringify(data), model: this.model };
  }

  async generateJson<T>(prompt: string): Promise<LLMJsonResult<T>> {
    const data = (this.router(prompt) ?? {}) as T;
    return { data, model: this.model };
  }
}
