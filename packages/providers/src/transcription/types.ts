export interface TranscriptionProvider {
  readonly kind: string;
  transcribe(opts: {
    mediaPath: string;
    language?: string;
  }): Promise<{ language: string; segments: { start: number; end: number; text: string }[] }>;
}
