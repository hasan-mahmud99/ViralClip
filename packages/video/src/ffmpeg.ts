import { execFile } from "node:child_process";

export interface FfmpegResult {
  stdout: string;
  stderr: string;
}

export function findFfmpeg(): string {
  return process.env.FFMPEG_BIN || "ffmpeg";
}

export function findFfprobe(): string {
  return process.env.FFPROBE_BIN || "ffprobe";
}

export function runFfmpeg(args: string[], opts?: { timeoutMs?: number }): Promise<FfmpegResult> {
  return run(findFfmpeg(), args, opts);
}

export function runFfprobe(args: string[], opts?: { timeoutMs?: number }): Promise<FfmpegResult> {
  return run(findFfprobe(), args, opts);
}

function run(bin: string, args: string[], opts?: { timeoutMs?: number }): Promise<FfmpegResult> {
  return new Promise((resolve, reject) => {
    const child = execFile(bin, args, { maxBuffer: 32 * 1024 * 1024, timeout: opts?.timeoutMs ?? 120_000 }, (err, stdout, stderr) => {
      if (err) {
        reject(new Error(`${bin} failed: ${stderr.slice(-4000) || err.message}`));
        return;
      }
      resolve({ stdout, stderr });
    });
  });
}
