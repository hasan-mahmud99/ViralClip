import { describe, it, expect, beforeAll } from "vitest";
import { mkdirSync, rmSync, existsSync } from "node:fs";
import { join } from "node:path";
import { SourceVideo } from "@viralclip/shared";
import { ReelPipeline, AgentServices } from "@viralclip/worker";
import { renderReel as ffmpegRender, runQa, sampleClip } from "@viralclip/video";
import { MockTranscriptionProvider } from "@viralclip/providers";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { randomUUID } from "node:crypto";

const execFileAsync = promisify(execFile);

const DIR = join(__dirname, "../../media/e2e");

async function synthNarrationWav(text: string, outPath: string): Promise<{ durationSec: number }> {
  const words = text.trim().split(/\s+/).length || 1;
  const durationSec = Math.max(2, words / 2.6);
  // generate a short tone + silence so duration is predictable, audio track present
  await execFileAsync("ffmpeg", [
    "-y",
    "-f",
    "lavfi",
    "-i",
    `sine=frequency=220:sample_rate=48000:duration=${durationSec}`,
    "-af",
    "volume=0.05",
    outPath,
  ]);
  return { durationSec };
}

async function makeServices(dir: string): Promise<AgentServices> {
  const transcriber = new MockTranscriptionProvider();
  return {
    async evaluateSource() {
      return { score: 8.5, category: "reaction", reason: "high surprise potential", recommended: true };
    },
    async transcribe(source) {
      const t = await transcriber.transcribe({ mediaPath: source.localFilePath ?? "" });
      return {
        id: `tr_${randomUUID()}`,
        sourceId: source.id,
        language: t.language,
        text: t.segments.map((s) => s.text).join(" "),
        segments: t.segments,
        createdAt: new Date().toISOString(),
      };
    },
    async findMoments(_source, transcript) {
      const segs = transcript.segments;
      const first = segs[0] ?? { start: 0, end: 3, text: "intro" };
      const last = segs[segs.length - 1] ?? { start: 3, end: 6, text: "outro" };
      return [
        {
          sourceId: _source.id,
          start: first.start,
          end: Math.max(first.end, (last?.end ?? first.end) - first.start + 2),
          score: 9.1,
          category: "surprise",
          reason: "clear payoff arc",
          hook: "Wait for what happens next...",
        },
      ];
    },
    async writeScript(_source, moment) {
      return {
        sourceId: _source.id,
        momentId: moment.id,
        language: "bn",
        hook: "এইটা অবিশ্বাস্য!",
        blocks: [
          { start: 0, end: 2, kind: "HOOK", text: "এইটা অবিশ্বাস্য!" },
          { start: 2, end: 6, kind: "CONTEXT", text: "ইউটিউবার এই চ্যালেঞ্জটা নিয়েছিলেন।" },
          { start: 6, end: 12, kind: "NARRATION", text: "কেউ কখনো এটা করেনি।" },
          { start: 12, end: 16, kind: "CONCLUSION", text: "আপনি কি ভাবছেন, এটা সম্ভব ছিল?" },
        ],
      };
    },
    async critiqueScript() {
      return { approved: true, score: 8, issues: [], improvements: [] };
    },
    async generateMetadata(_source, script) {
      return { title: script.hook, caption: script.hook + " #viral", hashtags: ["#viral", "#creator"] };
    },
    async renderReel(input) {
      const scriptText = input.script.blocks.map((b) => b.text).join(" ");
      const narrationPath = join(dir, "narration.wav");
      await synthNarrationWav(scriptText, narrationPath);
      await ffmpegRender({
        sourcePath: input.source.localFilePath!,
        outputPath: input.outputPath,
        narrationPath,
        subtitles: input.script.blocks.map((b) => ({ start: b.start, end: b.end, text: b.text })),
        width: 1080,
        height: 1920,
        enableSubtitles: true,
        start: input.moment.start,
        end: input.moment.end,
      });
      return { filePath: input.outputPath, durationSec: input.moment.end - input.moment.start };
    },
    async qa(input) {
      return runQa({ filePath: input.filePath, expectedWidth: 1080, expectedHeight: 1920, minDurationSec: 3, maxDurationSec: 120 });
    },
  };
}

describe("e2e: full mock pipeline produces a real MP4", () => {
  beforeAll(() => {
    mkdirSync(DIR, { recursive: true });
  });

  it("runs discovery->script->tts->render->qa", async () => {
    const src = join(DIR, "source.mp4");
    if (!existsSync(src)) await sampleClip({ outputPath: src, durationSec: 20, width: 1920, height: 1080 });

    const out = join(DIR, "final_test_reel.mp4");
    if (existsSync(out)) rmSync(out, { force: true });

    const pipeline = new ReelPipeline(await makeServices(DIR), {
      renderWidth: 1080,
      renderHeight: 1920,
      audioDir: DIR,
      sourceDir: DIR,
      subtitleDir: DIR,
      renderDir: DIR,
    });

    const source: SourceVideo = {
      id: `src_${randomUUID()}`,
      sourceUrl: "https://example.com/video",
      title: "Mock challenge video",
      rightsStatus: "USER_APPROVED",
      status: "APPROVED",
      localFilePath: src,
      ingestionKind: "LOCAL_FILE",
      discoveredAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const result = await pipeline.run(source, out);
    expect(result.qa.passed).toBe(true);
    expect(result.render.status).toBe("QA_PASSED");
    expect(existsSync(out)).toBe(true);
  }, 300_000);
});
