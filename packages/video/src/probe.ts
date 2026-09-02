import { runFfprobe } from "./ffmpeg";

export interface MediaProbe {
  durationSec: number | null;
  width: number | null;
  height: number | null;
  hasVideo: boolean;
  hasAudio: boolean;
  videoCodec: string | null;
  audioCodec: string | null;
  fileSizeBytes: number | null;
  format: string | null;
}

export async function probeMedia(filePath: string): Promise<MediaProbe> {
  const { stdout } = await runFfprobe([
    "-v",
    "error",
    "-print_format",
    "json",
    "-show_format",
    "-show_streams",
    filePath,
  ]);
  const json = JSON.parse(stdout) as {
    format?: { duration?: string; size?: string; format_name?: string };
    streams?: {
      codec_type?: string;
      codec_name?: string;
      width?: number;
      height?: number;
      duration?: string;
    }[];
  };
  const streams = json.streams ?? [];
  const video = streams.find((s) => s.codec_type === "video");
  const audio = streams.find((s) => s.codec_type === "audio");
  const format = json.format ?? {};
  return {
    durationSec: format.duration ? Number(format.duration) : null,
    width: video?.width ?? null,
    height: video?.height ?? null,
    hasVideo: Boolean(video),
    hasAudio: Boolean(audio),
    videoCodec: video?.codec_name ?? null,
    audioCodec: audio?.codec_name ?? null,
    fileSizeBytes: format.size ? Number(format.size) : null,
    format: format.format_name ?? null,
  };
}
