export interface TTSOptions {
  language?: "bn" | "en";
  rate?: number;
  voice?: string;
}

export interface TTSAudio {
  filePath: string;
  durationSec: number;
  format: string;
}

export interface TTSProvider {
  readonly kind: string;
  synthesize(text: string, opts?: TTSOptions): Promise<TTSAudio>;
}
