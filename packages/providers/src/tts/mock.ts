import { TTSProvider, TTSAudio } from "./types";
import { writeFile } from "node:fs/promises";
import { join } from "node:path";
import { randomUUID } from "node:crypto";

function estimateSpeechDuration(text: string, rate = 1.0): number {
  const words = text.trim().split(/\s+/).length || 1;
  return Math.max(1.5, words / (2.2 * rate) + 0.4);
}

function writeSilentWav(filePath: string, durationSec: number, sampleRate = 16000): Buffer {
  const numSamples = Math.floor(durationSec * sampleRate);
  const dataSize = numSamples * 2;
  const buf = Buffer.alloc(44 + dataSize);
  buf.write("RIFF", 0);
  buf.writeUInt32LE(36 + dataSize, 4);
  buf.write("WAVE", 8);
  buf.write("fmt ", 12);
  buf.writeUInt32LE(16, 16);
  buf.writeUInt16LE(1, 20);
  buf.writeUInt16LE(1, 22);
  buf.writeUInt32LE(sampleRate, 24);
  buf.writeUInt32LE(sampleRate * 2, 28);
  buf.writeUInt16LE(2, 32);
  buf.writeUInt16LE(16, 34);
  buf.write("data", 36);
  buf.writeUInt32LE(dataSize, 40);
  return buf;
}

export class MockTTSProvider implements TTSProvider {
  readonly kind = "mock";
  constructor(private readonly outDir: string) {}

  async synthesize(text: string, opts?: { rate?: number }): Promise<TTSAudio> {
    const durationSec = estimateSpeechDuration(text, opts?.rate ?? 1.0);
    const filePath = join(this.outDir, `mock-tts-${randomUUID()}.wav`);
    await writeFile(filePath, writeSilentWav(filePath, durationSec));
    return { filePath, durationSec, format: "wav" };
  }
}
