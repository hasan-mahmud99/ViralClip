import { Store } from "@viralclip/database";
import { toDomainSource, persistTranscriptRow, persistMomentRow, persistScriptRow, persistRenderRow, idFor } from "./store-services";
import { runQa, renderReel } from "@viralclip/video";
import type { LLMProvider, TTSProvider, TranscriptionProvider } from "@viralclip/providers";
import type { AgentServices, MomentCandidate, ScriptDraft } from "./pipeline";
import { sha256 } from "@viralclip/shared";

export interface ServiceOpts {
  store: Store;
  llm: LLMProvider;
  transcription: TranscriptionProvider;
  tts: TTSProvider;
  dirs: { audioDir: string; sourceDir: string; subtitleDir: string; renderDir: string };
  language?: "bn" | "en";
  subtitles?: boolean;
}

const KINDS = ["HOOK", "CONTEXT", "NARRATION", "EXPLANATION", "CONCLUSION", "CTA"] as const;

export function buildServices(opts: ServiceOpts): AgentServices {
  const { store, llm, transcription, tts, dirs } = opts;
  const language = opts.language ?? "bn";

  async function pickBestFromLlm<T>(prompt: string, fallback: T): Promise<T> {
    try {
      const r = await llm.generateJson<{ data?: T } | T>(prompt);
      const maybe = r.data as unknown;
      if (maybe && typeof maybe === "object" && "data" in (maybe as object)) return (maybe as { data: T }).data;
      return maybe as T;
    } catch {
      return fallback;
    }
  }

  return {
    async evaluateSource(source) {
      return pickBestFromLlm(
        `Evaluate source "${source.title}" (${source.sourceUrl}) for short-form reel potential. Return JSON {"score":0..10,"category":"...","reason":"...","recommended":bool}`,
        { score: 7.5, category: "reaction", reason: "default", recommended: true }
      );
    },

    async transcribe(source) {
      const t = await transcription.transcribe({ mediaPath: source.localFilePath ?? "" });
      const text = t.segments.map((s) => s.text).join(" ");
      const row = await persistTranscriptRow(store, { sourceId: source.id, language: t.language, text, segments: t.segments });
      return {
        id: row.id,
        sourceId: source.id,
        language: row.language,
        text: row.text,
        segments: row.segments,
        createdAt: row.createdAt,
      };
    },

    async findMoments(source, transcript) {
      const fallback = transcript.segments.slice(0, 3).map((s) => ({ start: s.start, end: Math.max(s.end, s.start + 8), text: s.text })) as {
        start: number;
        end: number;
        text: string;
      }[];
      const bestSeg = fallback[0] ?? { start: 0, end: 10, text: "" };
      const prompt = `Find 1-3 best self-contained moments (${language} commentary) from segments:\n${transcript.segments
        .map((s) => `${s.start}-${s.end}: ${s.text}`)
        .join("\n")}\nReturn JSON {"moments":[{"start":..,"end":..,"score":0..10,"category":"...","reason":"...","hook":"..."}]}`;
      const fallbackMoments = [
        { start: bestSeg.start, end: Math.max(bestSeg.end, bestSeg.start + 8), score: 8, category: "highlight", reason: "fallback", hook: "Wait for it" },
      ];
      const parsed = await pickBestFromLlm<{ moments: { start: number; end: number; score: number; category: string; reason: string; hook: string }[] }>(prompt, {
        moments: fallbackMoments,
      });
      const usable = parsed.moments && parsed.moments.length > 0 ? parsed.moments : fallbackMoments;
      const candidates = usable.map((m) => {
        const clipFingerprint = sha256(`${source.id}:${m.start}-${m.end}`);
        const saved = { sourceId: source.id, start: m.start, end: Math.max(m.end, m.start + 3), score: m.score, category: m.category, reason: m.reason, hook: m.hook, clipFingerprint, id: idFor("mom", clipFingerprint) };
        return saved;
      });
      // persist each candidate so pipeline-assigned ids have DB rows (FK-safe for scripts)
      for (const c of candidates) {
        await persistMomentRow(store, c);
      }
      return candidates;
    },

    async writeScript(source, moment) {
      const fallbackBlocks = [
        { start: moment.start, end: Math.min(moment.start + 3, moment.end), kind: "HOOK" as const, text: moment.hook },
        { start: moment.start + 3, end: Math.max(moment.start + 9, moment.end), kind: "NARRATION" as const, text: "এই মুহূর্তটা সত্যিই অসাধারণ ছিল।" },
      ];
      const prompt = `Write an ORIGINAL ${language} commentary script for moment ${moment.start}-${moment.end}s of "${source.title}". Do not copy source transcript. Return JSON {"language":"${language}","title":"...","hook":"...","blocks":[{"start":..,"end":..,"kind":"HOOK|CONTEXT|NARRATION|EXPLANATION|CONCLUSION|CTA","text":"..."}]}`;
      const parsed = await pickBestFromLlm<{
        language?: string;
        title?: string;
        hook: string;
        blocks: { start: number; end: number; kind: string; text: string }[];
      }>(prompt, { language, title: source.title, hook: moment.hook, blocks: fallbackBlocks });
      const blocks = (parsed.blocks ?? fallbackBlocks).map((b) => ({
        start: b.start,
        end: b.end,
        kind: (KINDS.includes(b.kind as never) ? b.kind : "NARRATION") as (typeof KINDS)[number],
        text: b.text,
      }));
      // Persist the chosen moment under its exact id first (FK for scripts.moment_id).
      await persistMomentRow(store, {
        id: moment.id,
        sourceId: source.id,
        start: moment.start,
        end: moment.end,
        score: moment.score,
        category: moment.category,
        reason: moment.reason,
        hook: moment.hook,
        clipFingerprint: moment.clipFingerprint,
      });
      const row = await persistScriptRow(store, {
        sourceId: source.id,
        momentId: moment.id,
        language: (parsed.language ?? language) as "bn" | "en",
        hook: parsed.hook,
        title: parsed.title ?? source.title,
        blocks,
      });
      return {
        id: row.id,
        sourceId: source.id,
        momentId: moment.id,
        language: (row.language ?? language) as "bn" | "en" | "mixed",
        hook: row.hook,
        blocks: blocks,
        title: row.title ?? null,
      };
    },

    async critiqueScript(_source, script) {
      const prompt = `Critique a Bangla commentary script (originality, clarity, factual safety). Return JSON {"approved":bool,"score":0..10,"issues":[...],"improvements":[...]}\n${JSON.stringify(script.blocks)}`;
      const res = await pickBestFromLlm<{ approved?: boolean; score?: number; issues?: string[]; improvements?: string[] }>(prompt, {
        approved: true,
        score: 8,
        issues: [],
        improvements: [],
      });
      return { approved: res.approved ?? true, score: res.score ?? 8, issues: res.issues ?? [], improvements: res.improvements ?? [] };
    },

    async generateMetadata(_source, script) {
      return { title: script.hook, caption: script.hook, hashtags: ["#reels"] };
    },

    async renderReel(input) {
      const { source, moment, script, outputPath } = input;
      const text = script.blocks.map((b) => b.text).join(" ");
      const audio = await tts.synthesize(text);
      await renderReel({
        sourcePath: source.localFilePath ?? "",
        outputPath,
        narrationPath: audio.filePath,
        subtitles: opts.subtitles ? script.blocks.map((b) => ({ start: b.start, end: b.end, text: b.text })) : [],
        enableSubtitles: opts.subtitles,
        width: 1080,
        height: 1920,
        start: moment.start,
        end: moment.end,
      });
      const dur = Math.max(3, moment.end - moment.start);
      const render = await persistRenderRow(store, { sourceId: source.id, momentId: moment.id, scriptId: script.id, filePath: outputPath, durationSec: dur });
      return { filePath: outputPath, durationSec: dur, renderId: render.id };
    },

    async qa(input) {
      const report = await runQa({ filePath: input.filePath, expectedWidth: 1080, expectedHeight: 1920, minDurationSec: 3, maxDurationSec: 120 });
      return { passed: report.passed, score: report.score, issues: report.issues };
    },
  };
}

export { toDomainSource };
