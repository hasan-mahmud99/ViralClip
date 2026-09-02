import { createLogger, settingsFromEnv } from "@viralclip/shared";
import { GeminiProvider, MockLLMProvider, WhisperTranscriptionProvider, MockTTSProvider, EspeakTTSProvider, MockTranscriptionProvider } from "@viralclip/providers";
import { renderReel, runQa, SubtitleCue } from "@viralclip/video";
import { ReelPipeline } from "./pipeline";
import { makeScriptingRouter, sourceFromLocalFile } from "./local-router";
import { join } from "node:path";
import { mkdirSync } from "node:fs";
import { randomUUID } from "node:crypto";

export interface LocalRunArgs {
  mediaPath: string;
  outDir: string;
  language?: "bn" | "en";
  title?: string;
  llm?: "mock" | "gemini";
  transcription?: "mock" | "whisper";
  tts?: "mock" | "espeak";
}

export async function runLocalPipeline(args: LocalRunArgs): Promise<{ outputPath: string; qaScore: number }> {
  const log = createLogger("local-runner");
  const settings = settingsFromEnv(process.env);
  const outDir = args.outDir;
  mkdirSync(join(outDir, "renders"), { recursive: true });
  mkdirSync(join(outDir, "audio"), { recursive: true });
  mkdirSync(join(outDir, "subtitles"), { recursive: true });

  const source = sourceFromLocalFile({ filePath: args.mediaPath, title: args.title });

  const llm =
    args.llm === "gemini"
      ? new GeminiProvider({
          apiKey: process.env.GEMINI_API_KEY ?? "",
          model: process.env.GEMINI_MODEL ?? "gemini-2.0-flash",
          maxRetries: 3,
          retryBaseMs: 1000,
        })
      : new MockLLMProvider(makeScriptingRouter({ language: args.language ?? "bn" }));

  const transcribe =
    args.transcription === "whisper"
      ? new WhisperTranscriptionProvider({
          scriptPath: process.env.WHISPER_SCRIPT ?? "infra/python/transcribe.py",
          pythonBin: process.env.WHISPER_PYTHON ?? "python",
          model: process.env.WHISPER_MODEL ?? "small",
        })
      : new MockTranscriptionProvider();

  const tts =
    args.tts === "espeak"
      ? new EspeakTTSProvider({ outDir: join(outDir, "audio") })
      : new MockTTSProvider(join(outDir, "audio"));

  const language = args.language ?? "bn";

  const services: import("./pipeline").AgentServices = {
    async evaluateSource() {
      return { score: 8.5, category: "reaction", reason: "short-form suitable", recommended: true };
    },
    async transcribe(src: { id: string }) {
      const t = await transcribe.transcribe({ mediaPath: source.localFilePath ?? "" });
      return { id: `tr_${randomUUID()}`, sourceId: src.id, language: t.language, text: t.segments.map((s) => s.text).join(" "), segments: t.segments, createdAt: new Date().toISOString() };
    },
    async findMoments(_src: { id: string }, transcript: { segments: { start: number; end: number; text: string }[] }) {
      const segs = transcript.segments;
      const first = segs[0] ?? { start: 0, end: 3, text: "intro" };
      const last = segs[segs.length - 1] ?? { start: 3, end: 6, text: "outro" };
      const end = Math.min(first.start + 30, last.end);
      const start = first.start;
      return [
        { sourceId: _src.id, start, end: Math.max(end, start + 5), score: 9.0, category: "surprise", reason: "strong payoff arc", hook: "Wait for the reaction...", clipFingerprint: `${_src.id}:${start}-${end}` },
      ];
    },
    async writeScript(src: { id: string }, moment: { id: string }) {
      const out = await llm.generateJson<{ language?: string; title?: string; hook: string; blocks: { start: number; end: number; kind: string; text: string }[] }>(
        `Write an ORIGINAL Bangla narration...`,
        {}
      );
      const data = out.data;
      const blocks = (data.blocks ?? []).map((b) => ({
        ...b,
        kind: (["HOOK", "CONTEXT", "NARRATION", "EXPLANATION", "CONCLUSION", "CTA"].includes(b.kind)
          ? b.kind
          : "NARRATION") as "HOOK" | "CONTEXT" | "NARRATION" | "EXPLANATION" | "CONCLUSION" | "CTA",
      }));
      return {
        sourceId: src.id,
        momentId: moment.id,
        language: (data.language ?? language) as "bn" | "en" | "mixed",
        hook: data.hook,
        blocks,
        title: data.title ?? "",
      };
    },
    async critiqueScript() {
      return { approved: true, score: 8, issues: [] as string[], improvements: [] as string[] };
    },
    async generateMetadata() {
      return { title: "Local reel", caption: "caption", hashtags: ["#viral"] as string[] };
    },
    async renderReel(input: { source: { localFilePath?: string | null }; moment: { start: number; end: number }; script: { blocks: { start: number; end: number; text: string }[] }; outputPath: string }) {
      const text = input.script.blocks.map((b) => b.text).join(" ");
      const audio = await tts.synthesize(text);
      const subtitles: SubtitleCue[] = input.script.blocks.map((b) => ({ start: b.start, end: b.end, text: b.text }));
      await renderReel({
        sourcePath: input.source.localFilePath!,
        outputPath: input.outputPath,
        narrationPath: audio.filePath,
        subtitles,
        enableSubtitles: true,
        width: 1080,
        height: 1920,
        start: input.moment.start,
        end: input.moment.end,
      });
      return { filePath: input.outputPath, durationSec: input.moment.end - input.moment.start };
    },
    async qa(input: { filePath: string }) {
      const report = await runQa({ filePath: input.filePath, expectedWidth: 1080, expectedHeight: 1920, minDurationSec: 3, maxDurationSec: 120 });
      return { passed: report.passed, score: report.score, issues: report.issues };
    },
  };

  const pipeline = new ReelPipeline(services, {
    renderWidth: 1080,
    renderHeight: 1920,
    audioDir: join(outDir, "audio"),
    sourceDir: join(outDir, "sources"),
    subtitleDir: join(outDir, "subtitles"),
    renderDir: join(outDir, "renders"),
  });

  const outputPath = join(outDir, "renders", `reel-${Date.now()}.mp4`);
  const { qa } = await pipeline.run(source, outputPath);
  log.info("local pipeline finished", { outputPath, qaScore: qa.score });
  return { outputPath, qaScore: qa.score };
}
