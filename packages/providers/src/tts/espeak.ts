import { TTSProvider, TTSAudio } from "./types";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { join } from "node:path";
import { randomUUID } from "node:crypto";

const execFileAsync = promisify(execFile);

export class EspeakTTSProvider implements TTSProvider {
  readonly kind = "espeak-ng";
  constructor(
    private readonly opts: { outDir: string; bin?: string; voice?: string }
  ) {}

  async synthesize(text: string, opts?: { language?: "bn" | "en"; voice?: string }): Promise<TTSAudio> {
    const lang = opts?.language === "bn" ? "bn" : "en";
    const filePath = join(this.opts.outDir, `tts-${randomUUID()}.wav`);
    const voice = opts?.voice ?? this.opts.voice ?? (lang === "bn" ? "bn" : "en");
    await execFileAsync(this.opts.bin ?? "espeak-ng", ["-v", voice, "-w", filePath, text]);
    const durationSec = Math.max(1, text.length / 14);
    return { filePath, durationSec, format: "wav" };
  }
}
