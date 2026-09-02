import { z } from "zod";

export const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  MOCK_MODE: z.enum(["true", "false"]).default("false"),
  DRY_RUN: z.enum(["true", "false"]).default("true"),
  LLM_PROVIDER: z.string().default("gemini"),
  GEMINI_API_KEY: z.string().default(""),
  GEMINI_MODEL: z.string().default("gemini-2.5-flash"),
  GEMINI_MAX_RETRIES: z.coerce.number().int().default(4),
  GEMINI_RETRY_BASE_MS: z.coerce.number().default(1000),
  GEMINI_CONCURRENCY: z.coerce.number().int().default(2),

  YOUTUBE_API_KEY: z.string().default(""),
  YOUTUBE_SEARCH_QUERIES: z.string().default("viral creator moments,unexpected reactions,best challenge moments"),
  YOUTUBE_MAX_RESULTS: z.coerce.number().int().default(10),
  YOUTUBE_LOOKBACK_HOURS: z.coerce.number().int().default(168),
  YOUTUBE_LANGUAGE: z.string().default("en"),
  YOUTUBE_REGION: z.string().default("US"),
  ENABLE_DYNAMIC_QUERIES: z.enum(["true", "false"]).default("false"),

  META_ACCESS_TOKEN: z.string().default(""),
  META_PAGE_ID: z.string().default(""),
  META_API_VERSION: z.string().default("v22.0"),

  DATABASE_URL: z.string().default(""),
  REDIS_URL: z.string().default(""),

  API_PORT: z.coerce.number().default(4000),
  API_HOST: z.string().default("0.0.0.0"),
  ADMIN_PASSWORD: z.string().default("change-me"),

  TIMEZONE: z.string().default("Asia/Dhaka"),
  DAILY_REEL_TARGET: z.coerce.number().int().default(3),
  PUBLISH_TIMES: z.string().default("09:00,14:00,20:00"),
  APPROVAL_MODE: z.enum(["manual", "automatic", "hybrid"]).default("manual"),
  SOURCE_RIGHTS_POLICY: z.enum(["manual", "approved_only", "licensed_only", "trusted_sources"]).default("approved_only"),
  COMMENTARY_LANGUAGE: z.enum(["bn", "en", "mixed"]).default("bn"),
  MIN_MOMENT_SCORE: z.coerce.number().default(7.5),
  MIN_REEL_SCORE: z.coerce.number().default(7.5),
  MIN_CLIP_SECONDS: z.coerce.number().default(10),
  MAX_CLIP_SECONDS: z.coerce.number().default(60),
  MIN_REEL_SECONDS: z.coerce.number().default(20),
  MAX_REEL_SECONDS: z.coerce.number().default(60),

  SUBTITLES_ENABLED: z.enum(["true", "false"]).default("true"),
  MUSIC_ENABLED: z.enum(["true", "false"]).default("false"),
  MUSIC_DIRECTORY: z.string().default("media/music"),
  TTS_PROVIDER: z.string().default("mock"),

  STORAGE_BASE_PATH: z.string().default("media"),
  SOURCE_STORAGE: z.string().default("media/sources"),
  AUDIO_STORAGE: z.string().default("media/audio"),
  SUBTITLE_STORAGE: z.string().default("media/subtitles"),
  RENDER_STORAGE: z.string().default("media/renders"),
  THUMBNAIL_STORAGE: z.string().default("media/thumbnails"),

  TRANSCRIPTION_CONCURRENCY: z.coerce.number().int().default(1),
  RENDER_CONCURRENCY: z.coerce.number().int().default(1),
  PUBLISH_CONCURRENCY: z.coerce.number().int().default(1),

  CANDIDATE_VIDEOS_PER_RUN: z.coerce.number().int().default(10),
});

export type EnvConfig = z.infer<typeof envSchema>;

export function parseEnv(env: NodeJS.ProcessEnv = process.env): EnvConfig {
  const parsed = envSchema.safeParse(env);
  if (!parsed.success) {
    const issues = parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; ");
    throw new Error(`Invalid environment: ${issues}`);
  }
  return parsed.data;
}

export function loadEnv(env: NodeJS.ProcessEnv = process.env): EnvConfig {
  return parseEnv(env);
}
