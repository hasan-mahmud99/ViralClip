import { z } from "zod";

export const SettingsSchema = z.object({
  dailyReelTarget: z.number().int().min(1).default(3),
  publishTimes: z.array(z.string().regex(/^\d{2}:\d{2}$/)).default(["09:00", "14:00", "20:00"]),
  timezone: z.string().default("Asia/Dhaka"),
  approvalMode: z.enum(["manual", "automatic", "hybrid"]).default("manual"),
  sourceRightsPolicy: z.enum(["manual", "approved_only", "licensed_only", "trusted_sources"]).default("approved_only"),
  commentaryLanguage: z.enum(["bn", "en", "mixed"]).default("bn"),
  minMomentScore: z.number().default(7.5),
  minReelScore: z.number().default(7.5),
  minClipSeconds: z.number().default(10),
  maxClipSeconds: z.number().default(60),
  minReelSeconds: z.number().default(20),
  maxReelSeconds: z.number().default(60),
  subtitlesEnabled: z.boolean().default(true),
  musicEnabled: z.boolean().default(false),
  candidateVideosPerRun: z.number().int().default(10),
});

export type Settings = z.infer<typeof SettingsSchema>;

export const DEFAULT_SETTINGS: Settings = {
  dailyReelTarget: 3,
  publishTimes: ["09:00", "14:00", "20:00"],
  timezone: "Asia/Dhaka",
  approvalMode: "manual",
  sourceRightsPolicy: "approved_only",
  commentaryLanguage: "bn",
  minMomentScore: 7.5,
  minReelScore: 7.5,
  minClipSeconds: 10,
  maxClipSeconds: 60,
  minReelSeconds: 20,
  maxReelSeconds: 60,
  subtitlesEnabled: true,
  musicEnabled: false,
  candidateVideosPerRun: 10,
};

export function settingsFromEnv(env: NodeJS.ProcessEnv): Settings {
  return SettingsSchema.parse({
    dailyReelTarget: Number(env.DAILY_REEL_TARGET ?? 3),
    publishTimes: (env.PUBLISH_TIMES ?? "09:00,14:00,20:00").split(",").map((s) => s.trim()),
    timezone: env.TIMEZONE ?? "Asia/Dhaka",
    approvalMode: env.APPROVAL_MODE ?? "manual",
    sourceRightsPolicy: env.SOURCE_RIGHTS_POLICY ?? "approved_only",
    commentaryLanguage: env.COMMENTARY_LANGUAGE ?? "bn",
    minMomentScore: Number(env.MIN_MOMENT_SCORE ?? 7.5),
    minReelScore: Number(env.MIN_REEL_SCORE ?? 7.5),
    minClipSeconds: Number(env.MIN_CLIP_SECONDS ?? 10),
    maxClipSeconds: Number(env.MAX_CLIP_SECONDS ?? 60),
    minReelSeconds: Number(env.MIN_REEL_SECONDS ?? 20),
    maxReelSeconds: Number(env.MAX_REEL_SECONDS ?? 60),
    subtitlesEnabled: (env.SUBTITLES_ENABLED ?? "true") === "true",
    musicEnabled: (env.MUSIC_ENABLED ?? "false") === "true",
    candidateVideosPerRun: Number(env.CANDIDATE_VIDEOS_PER_RUN ?? 10),
  });
}
