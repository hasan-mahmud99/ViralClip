import { runFfmpeg } from "./ffmpeg";
import { writeFile, mkdir } from "node:fs/promises";
import { dirname, relative, resolve } from "node:path";
import { toAss, SubtitleCue } from "./subtitles";

export interface RenderOptions {
  sourcePath: string;
  outputPath: string;
  narrationPath?: string | null;
  musicPath?: string | null;
  subtitles?: SubtitleCue[];
  start?: number;
  end?: number;
  width?: number;
  height?: number;
  fps?: number;
  videoBitrate?: string;
  audioBitrate?: string;
  sourceVolume?: number;
  enableSubtitles?: boolean;
}

function relForFilter(p: string): string {
  // Return a path without drive-letter colon (colon terminates filter option names in ffmpeg graphs).
  const abs = resolve(p);
  const rel = relative(resolve(process.cwd()), abs);
  return rel.replace(/\\/g, "/");
}

export async function renderReel(opts: RenderOptions): Promise<{ outputPath: string }> {
  const width = opts.width ?? 1080;
  const height = opts.height ?? 1920;
  const fps = opts.fps ?? 30;
  const sourceVolume = opts.sourceVolume ?? 0.3;

  await mkdir(dirname(opts.outputPath), { recursive: true });

  const inputs = ["-y", "-i", opts.sourcePath];
  if (opts.narrationPath) inputs.push("-i", opts.narrationPath);
  if (opts.musicPath) inputs.push("-i", opts.musicPath);

  const parts: string[] = [];
  const narrationIdx = opts.narrationPath ? 1 : -1;
  const musicIdx = opts.musicPath ? (opts.narrationPath ? 2 : 1) : -1;

  // video chain
  parts.push(`[0:v]scale=${width}:${height}:force_original_aspect_ratio=increase,crop=${width}:${height},setsar=1[vbase]`);
  let videoLabel = "[vbase]";
  if (opts.enableSubtitles && opts.subtitles && opts.subtitles.length > 0) {
    const assPath = opts.outputPath.replace(/\.mp4$/i, "") + ".ass";
    await writeFile(assPath, toAss(opts.subtitles, { width, height }));
    parts.push(`[vbase]ass=filename=${relForFilter(assPath)}[vsub]`);
    videoLabel = "[vsub]";
  }
  parts.push(`${videoLabel}copy[vout]`);

  // audio chain
  const audioInputs: string[] = [];
  if (narrationIdx >= 0) {
    parts.push(`[${narrationIdx}:a]aformat=channel_layouts=stereo:sample_rates=48000,volume=1.0[a_nar]`);
    audioInputs.push("[a_nar]");
  }
  parts.push(`[0:a]aformat=channel_layouts=stereo:sample_rates=48000,volume=${sourceVolume}[a_src]`);
  audioInputs.push("[a_src]");
  if (musicIdx >= 0) {
    parts.push(`[${musicIdx}:a]aformat=channel_layouts=stereo:sample_rates=48000,volume=0.16[a_mus]`);
    audioInputs.push("[a_mus]");
  }
  parts.push(`${audioInputs.join("")}amix=inputs=${audioInputs.length}:normalize=0,alimiter=limit=0.95[aout]`);

  const filterComplex = parts.join(";");

  const args = [...inputs];
  if (opts.start !== undefined) args.push("-ss", String(opts.start));
  if (opts.end !== undefined) args.push("-to", String(opts.end));
  args.push("-filter_complex", filterComplex, "-map", "[vout]", "-map", "[aout]");
  args.push(
    "-r",
    String(fps),
    "-c:v",
    "libx264",
    "-preset",
    "veryfast",
    "-crf",
    "23",
    "-pix_fmt",
    "yuv420p",
    "-b:v",
    opts.videoBitrate ?? "5M",
    "-c:a",
    "aac",
    "-b:a",
    opts.audioBitrate ?? "192k",
    "-movflags",
    "+faststart",
    opts.outputPath
  );

  await runFfmpeg(args, { timeoutMs: 300_000 });
  return { outputPath: opts.outputPath };
}
