import { loadEnv, EnvConfig, envSchema } from "./env";

export interface RuntimeConfig extends EnvConfig {
  publishTimes: string[];
  authorizedChannels: string[];
  mediaRoot: string;
}

export function runtimeConfig(env: NodeJS.ProcessEnv = process.env): RuntimeConfig {
  const envConfig: EnvConfig = loadEnv(env);
  return {
    ...envConfig,
    publishTimes: envConfig.PUBLISH_TIMES.split(",")
      .map((s) => s.trim())
      .filter(Boolean),
    authorizedChannels: (env.AUTHORIZED_YOUTUBE_CHANNELS || "")
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean),
    mediaRoot: envConfig.STORAGE_BASE_PATH,
  };
}

export { envSchema };
export type { EnvConfig };
