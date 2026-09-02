import { probeMedia } from "./probe";
import { runFfmpeg } from "./ffmpeg";

export interface QaCheck {
  name: string;
  passed: boolean;
  detail?: string;
}

export interface QaReport {
  passed: boolean;
  score: number;
  checks: QaCheck[];
  issues: string[];
}

export async function runQa(opts: {
  filePath: string;
  minDurationSec?: number;
  maxDurationSec?: number;
  expectedWidth?: number;
  expectedHeight?: number;
}): Promise<QaReport> {
  const probe = await probeMedia(opts.filePath);
  const checks: QaCheck[] = [];
  const issues: string[] = [];

  checks.push({ name: "file-valid", passed: probe.format !== null, detail: probe.format ?? undefined });
  checks.push({ name: "has-video", passed: probe.hasVideo, detail: probe.videoCodec ?? undefined });
  checks.push({ name: "has-audio", passed: probe.hasAudio, detail: probe.audioCodec ?? undefined });

  if (probe.durationSec === null) {
    checks.push({ name: "duration-unknown", passed: false });
  } else {
    const min = opts.minDurationSec ?? 0;
    const max = opts.maxDurationSec ?? 600;
    const durOk = probe.durationSec >= min && probe.durationSec <= max;
    checks.push({ name: "duration-in-range", passed: durOk, detail: `${probe.durationSec.toFixed(2)}s` });
    if (!durOk) issues.push(`duration ${probe.durationSec.toFixed(2)}s outside [${min},${max}]`);
  }

  if (opts.expectedWidth && probe.width !== opts.expectedWidth) {
    checks.push({ name: "width-match", passed: false, detail: `${probe.width}` });
    issues.push(`width ${probe.width} != ${opts.expectedWidth}`);
  } else {
    checks.push({ name: "width-match", passed: true, detail: `${probe.width}` });
  }
  if (opts.expectedHeight && probe.height !== opts.expectedHeight) {
    checks.push({ name: "height-match", passed: false, detail: `${probe.height}` });
    issues.push(`height ${probe.height} != ${opts.expectedHeight}`);
  } else {
    checks.push({ name: "height-match", passed: true, detail: `${probe.height}` });
  }

  if (!probe.hasAudio) issues.push("no audio stream");
  if (!probe.hasVideo) issues.push("no video stream");
  if (probe.fileSizeBytes !== null && probe.fileSizeBytes < 1_000) issues.push("file suspiciously small");

  const failed = checks.filter((c) => !c.passed);
  const passed = failed.length === 0 && issues.length === 0;
  const score = Math.max(0, 100 - failed.length * 20 - issues.length * 5);

  return { passed, score, checks, issues };
}

export async function sampleClip(opts: { outputPath: string; durationSec?: number; width?: number; height?: number }): Promise<void> {
  const w = opts.width ?? 1080;
  const h = opts.height ?? 1920;
  const dur = opts.durationSec ?? 40;
  await runFfmpeg(
    [
      "-y",
      "-f",
      "lavfi",
      "-i",
      `testsrc2=size=${w}x${h}:rate=30:duration=${dur}`,
      "-f",
      "lavfi",
      "-i",
      `sine=frequency=440:sample_rate=48000:duration=${dur}`,
      "-c:v",
      "libx264",
      "-pix_fmt",
      "yuv420p",
      "-c:a",
      "aac",
      "-shortest",
      opts.outputPath,
    ],
    { timeoutMs: 300_000 }
  );
}
