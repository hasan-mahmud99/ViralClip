import { z } from "zod";

export const SourceEvaluationSchema = z.object({
  score: z.number().min(0).max(10),
  category: z.string(),
  reason: z.string(),
  recommended: z.boolean(),
});

export const CandidateMomentSchema = z.object({
  start: z.number().nonnegative(),
  end: z.number().positive(),
  score: z.number().min(0).max(10),
  category: z.string(),
  reason: z.string(),
  hook: z.string(),
  commentaryAngle: z.string().optional(),
});

export const CommentaryBlockSchema = z.object({
  start: z.number().nonnegative(),
  end: z.number().nonnegative(),
  kind: z.enum(["HOOK", "CONTEXT", "NARRATION", "EXPLANATION", "CONCLUSION", "CTA"]),
  text: z.string(),
});

export const CommentaryScriptSchema = z.object({
  language: z.enum(["bn", "en", "mixed"]),
  title: z.string(),
  hook: z.string(),
  blocks: z.array(CommentaryBlockSchema),
});

export const ScriptCritiqueSchema = z.object({
  approved: z.boolean(),
  score: z.number().min(0).max(10),
  issues: z.array(z.string()),
  improvements: z.array(z.string()),
});

export const ReelMetadataSchema = z.object({
  title: z.string(),
  caption: z.string(),
  description: z.string(),
  hashtags: z.array(z.string()),
  cta: z.string().optional(),
});

export const SearchQueryBatchSchema = z.object({
  queries: z.array(z.string().min(3)).max(15),
});

export type SourceEvaluationInput = z.infer<typeof SourceEvaluationSchema>;
export type CandidateMomentInput = z.infer<typeof CandidateMomentSchema>;
export type CommentaryScriptInput = z.infer<typeof CommentaryScriptSchema>;
export type ScriptCritiqueInput = z.infer<typeof ScriptCritiqueSchema>;
export type ReelMetadataInput = z.infer<typeof ReelMetadataSchema>;
export type SearchQueryBatchInput = z.infer<typeof SearchQueryBatchSchema>;
