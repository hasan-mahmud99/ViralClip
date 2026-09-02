import { SourceVideo, CommentaryScriptInput, ScriptCritiqueInput } from "@viralclip/shared";

export interface RouterOpts {
  language: "bn" | "en";
}

export function makeScriptingRouter(opts?: RouterOpts) {
  const language = opts?.language ?? "bn";
  return (prompt: string): unknown => {
    const lower = prompt.toLowerCase();
    if (lower.includes("evaluate whether a youtube video")) {
      return { score: 8.6, category: "reaction", reason: "high short-form potential", recommended: true };
    }
    if (lower.includes("most interesting self-contained moments")) {
      return {
        moments: [
          { start: 3, end: 18, score: 9.2, category: "surprise", reason: "clear payoff", hook: "Wait for the reaction..." },
          { start: 20, end: 33, score: 8.1, category: "funny", reason: "comedic beat", hook: "This goes wrong fast" },
        ],
      };
    }
    if (lower.includes("write an original") && lower.includes("bangla")) {
      const script: CommentaryScriptInput = {
        language,
        title: "অবিশ্বাস্য মুহূর্ত!",
        hook: "এইটা কি সত্যি হলো?",
        blocks: [
          { start: 0, end: 2, kind: "HOOK", text: "এইটা কি সত্যি হলো?" },
          { start: 2, end: 6, kind: "CONTEXT", text: "ক্রিয়েটর একটা বড় চ্যালেঞ্জ নিয়েছিলেন।" },
          { start: 6, end: 13, kind: "NARRATION", text: "কেউ ভাবেনি এটা সম্ভব হবে।" },
          { start: 13, end: 18, kind: "CONCLUSION", text: "এমন মুহূর্ত ইন্টারনেটে সত্যিই বিরল।" },
        ],
      };
      return script;
    }
    if (lower.includes("critique a bangla commentary script")) {
      const critique: ScriptCritiqueInput = { approved: true, score: 8.4, issues: [], improvements: ["add a stronger CTA"] };
      return critique;
    }
    if (lower.includes("facebook reel metadata")) {
      return { title: "অবিশ্বাস্য মুহূর্ত", caption: "এইটা দেখুন!", description: "মজার ক্রিয়েটর মুহূর্ত", hashtags: ["#viral", "#reaction"], cta: "Follow for more" };
    }
    if (lower.includes("search queries")) {
      return { queries: ["viral creator moments", "funniest streamer reactions"] };
    }
    return { ok: true };
  };
}

export function sourceFromLocalFile(args: { filePath: string; title?: string }): SourceVideo {
  const now = new Date().toISOString();
  return {
    id: `src_${Date.now()}`,
    sourceUrl: `file://${args.filePath}`,
    title: args.title ?? "Local sample source",
    rightsStatus: "USER_APPROVED",
    status: "APPROVED",
    localFilePath: args.filePath,
    ingestionKind: "LOCAL_FILE",
    discoveredAt: now,
    createdAt: now,
    updatedAt: now,
  };
}
