import { describe, it, expect, beforeAll } from "vitest";
import { mkdirSync, existsSync } from "node:fs";
import { join } from "node:path";
import { renderReel, runQa, probeMedia, sampleClip, SubtitleCue } from "@viralclip/video";

const OUT = join(__dirname, "../../media/renders");
const SRC = join(__dirname, "../../media/sources");

describe("video pipeline (real FFmpeg)", () => {
  beforeAll(() => {
    mkdirSync(OUT, { recursive: true });
    mkdirSync(SRC, { recursive: true });
  });

  it("renders a real 1080x1920 MP4 with subtitles and passes QA", async () => {
    const src = join(SRC, "sample-source.mp4");
    if (!existsSync(src)) {
      await sampleClip({ outputPath: src, durationSec: 6, width: 1920, height: 1080 });
    }

    const subtitles: SubtitleCue[] = [
      { start: 0.5, end: 2.5, text: "এইটা অবিশ্বাস্য!" },
      { start: 3, end: 5, text: "কেউ কখনো এটা করেনি।" },
    ];
    const out = join(OUT, "reel.mp4");
    await renderReel({
      sourcePath: src,
      outputPath: out,
      narrationPath: null,
      subtitles,
      width: 1080,
      height: 1920,
      enableSubtitles: true,
      start: 0,
      end: 5,
    });

    const probe = await probeMedia(out);
    expect(probe.hasVideo).toBe(true);
    expect(probe.hasAudio).toBe(true);
    expect(probe.width).toBe(1080);
    expect(probe.height).toBe(1920);

    const qa = await runQa({ filePath: out, expectedWidth: 1080, expectedHeight: 1920, minDurationSec: 1, maxDurationSec: 60 });
    expect(qa.passed, qa.issues.join(" | ")).toBe(true);
    expect(qa.score).toBeGreaterThanOrEqual(80);
  }, 300_000);
});
