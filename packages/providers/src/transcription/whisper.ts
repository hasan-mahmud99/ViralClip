import { TranscriptionProvider } from "./types";
import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

export class WhisperTranscriptionProvider implements TranscriptionProvider {
  readonly kind = "faster-whisper";
  constructor(private readonly opts: { scriptPath: string; pythonBin?: string; model?: string }) {}

  async transcribe(opts: { mediaPath: string; language?: string }) {
    const { stdout } = await execFileAsync(this.opts.pythonBin ?? "python3", [
      this.opts.scriptPath,
      "--media",
      opts.mediaPath,
      "--model",
      this.opts.model ?? "small",
      "--language",
      opts.language ?? "auto",
      "--json",
    ]);
    const parsed = JSON.parse(stdout) as { language: string; segments: { start: number; end: number; text: string }[] };
    return { language: parsed.language, segments: parsed.segments };
  }
}
