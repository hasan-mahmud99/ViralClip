import { TranscriptionProvider } from "./types";

export class MockTranscriptionProvider implements TranscriptionProvider {
  readonly kind = "mock";
  constructor(private readonly seed?: { segments?: { start: number; end: number; text: string }[] }) {}

  async transcribe(opts: { mediaPath: string; language?: string }) {
    const segments =
      this.seed?.segments ?? [
        { start: 0, end: 4.2, text: "Okay so today I'm going to try something really crazy." },
        { start: 4.2, end: 9.8, text: "Nobody has ever done this before on this channel." },
        { start: 9.8, end: 15.1, text: "If this works it will completely change everything." },
        { start: 15.1, end: 21.5, text: "Wait, did that just actually happen?" },
        { start: 21.5, end: 28.4, text: "This is honestly the most unbelievable thing I have ever seen." },
        { start: 28.4, end: 34.2, text: "I cannot believe that actually worked on the first try." },
      ];
    return { language: opts.language ?? "en", segments };
  }
}
