import { config as loadDotenv } from "dotenv";
import { createLogger, nowIso, sha256 } from "@viralclip/shared";
import { InMemoryStore, PostgresStore, Store, SourceVideoRow } from "@viralclip/database";
import {
  GeminiProvider,
  MockLLMProvider,
  WhisperTranscriptionProvider,
  MockTranscriptionProvider,
  MockTTSProvider,
  EspeakTTSProvider,
  MockDiscoveryProvider,
  YouTubeDiscoveryProvider,
  MockPublisherProvider,
  FacebookPublisherProvider,
} from "@viralclip/providers";
import { runSourceDiscovery } from "./discovery-processor";
import { buildServices } from "./services";
import { createReel, advanceReel, markApproved } from "./pipeline-runner";
import { gateAndPublish } from "./publish-gate";
import { makeScriptingRouter } from "./local-router";
import { join } from "node:path";

const log = createLogger("viralclip-worker");

export interface EnvOverrides {
  env?: NodeJS.ProcessEnv;
  store?: Store;
}

export interface WorkerRunResult {
  discovered: number;
  ready: number;
  publish: { action: string; reason: string }[];
}

function isTruthy(v: string | undefined): boolean {
  return v === "true" || v === "1";
}

export function createStoreFromEnv(env: NodeJS.ProcessEnv): Store {
  const url = env.DATABASE_URL ?? process.env.DATABASE_URL;
  if (url) {
    return new PostgresStore(url);
  }
  return new InMemoryStore();
}

function buildProviders(env: NodeJS.ProcessEnv, outRoot: string) {
  const mock = isTruthy(env.MOCK_MODE) || !env.GEMINI_API_KEY;
  const llm = mock
    ? new MockLLMProvider(makeScriptingRouter({ language: (env.COMMENTARY_LANGUAGE ?? "bn") as "bn" | "en" }))
    : new GeminiProvider({
        apiKey: env.GEMINI_API_KEY!,
        model: env.GEMINI_MODEL ?? "gemini-2.5-flash",
        maxRetries: Number(env.GEMINI_MAX_RETRIES ?? 4),
        retryBaseMs: Number(env.GEMINI_RETRY_BASE_MS ?? 1000),
      });

  const useWhisper = env.TRANSCRIPTION_PROVIDER === "whisper";
  const transcription = useWhisper
    ? new WhisperTranscriptionProvider({
        scriptPath: env.WHISPER_SCRIPT ?? "infra/python/transcribe.py",
        pythonBin: env.WHISPER_PYTHON ?? "python",
        model: env.WHISPER_MODEL ?? "small",
      })
    : new MockTranscriptionProvider();

  const tts = env.TTS_PROVIDER === "espeak" ? new EspeakTTSProvider({ outDir: join(outRoot, "audio") }) : new MockTTSProvider(join(outRoot, "audio"));

  const discovery =
    env.YOUTUBE_API_KEY && !mock
      ? new YouTubeDiscoveryProvider({ apiKey: env.YOUTUBE_API_KEY })
      : new MockDiscoveryProvider();

  const publisher =
    env.META_ACCESS_TOKEN && env.META_PAGE_ID
      ? new FacebookPublisherProvider({ accessToken: env.META_ACCESS_TOKEN, pageId: env.META_PAGE_ID, apiVersion: env.META_API_VERSION ?? "v22.0" })
      : new MockPublisherProvider(env.META_PAGE_ID ?? "mock-page");

  return { llm, transcription, tts, discovery, publisher, mock };
}

export async function runWorkerOnce(opts?: EnvOverrides): Promise<WorkerRunResult> {
  const env = opts?.env ?? process.env;
  const store: Store = opts?.store ?? createStoreFromEnv(env);
  const settings = {
    dailyReelTarget: Number(env.DAILY_REEL_TARGET ?? 3),
    approvalMode: (env.APPROVAL_MODE ?? "manual") as "manual" | "automatic" | "hybrid",
    sourceRightsPolicy: (env.SOURCE_RIGHTS_POLICY ?? "approved_only") as "manual" | "approved_only" | "licensed_only" | "trusted_sources",
    timezone: env.TIMEZONE ?? "Asia/Dhaka",
  };
  const dryRun = env.DRY_RUN === undefined ? true : isTruthy(env.DRY_RUN);
  const outRoot = env.STORAGE_BASE_PATH ?? "media";

  const { llm, transcription, tts, discovery, publisher, mock } = buildProviders(env, outRoot);

  const dirs = {
    audioDir: join(outRoot, "audio"),
    sourceDir: join(outRoot, "sources"),
    subtitleDir: join(outRoot, "subtitles"),
    renderDir: join(outRoot, "renders"),
  };

  const services = buildServices({
    store,
    llm,
    transcription,
    tts,
    dirs,
    language: (env.COMMENTARY_LANGUAGE ?? "bn") as "bn" | "en",
    subtitles: env.SUBTITLES_ENABLED === undefined ? true : isTruthy(env.SUBTITLES_ENABLED),
  });

  log.info("worker once starting", { dryRun, mock, target: settings.dailyReelTarget, approval: settings.approvalMode });

  // 1) Discovery (respect queries; dedupe/rights handled in processor)
  const queries = (env.YOUTUBE_SEARCH_QUERIES ?? "viral creator moments")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  const trusted = (env.AUTHORIZED_YOUTUBE_CHANNELS ?? env.TRUSTED_CHANNELS ?? "").split(",").map((s) => s.trim()).filter(Boolean);
  const disc = await runSourceDiscovery(store, discovery, {
    queries,
    maxResults: Number(env.YOUTUBE_MAX_RESULTS ?? 5),
    policy: settings.sourceRightsPolicy,
    trustedChannels: trusted,
  });
  log.info("discovery complete", disc);

  // 2) Process every APPROVED + ingested source that doesn't already have a finished reel.
  const localSource = env.SOURCE_MEDIA ?? env.LOCAL_SOURCE_FILE;
  if (localSource) {
    const existingForFile = (await store.listSources()).find((s) => s.localFilePath === localSource);
    if (!existingForFile) {
      const now = nowIso();
      await store.saveSource({
        id: `src_local_${sha256(localSource).slice(0, 16)}`,
        sourceUrl: `file://${localSource}`,
        sourcePlatform: "local",
        title: env.SOURCE_TITLE ?? "Local source",
        rightsStatus: "USER_APPROVED",
        status: "APPROVED",
        localFilePath: localSource,
        sourceHash: `local-${sha256(localSource).slice(0, 16)}`,
        createdAt: now,
        updatedAt: now,
      });
    }
  }
  const approved = (await store.listSources({ status: "APPROVED" })).filter(
    (s) => s.localFilePath && s.rightsStatus !== "BLOCKED"
  );
  if (approved.length === 0) log.info("no approved+ingested sources to process");
  const result: WorkerRunResult = { discovered: disc.inserted, ready: 0, publish: [] };
  for (const source of approved) {
    const existingReels = await store.listReels();
    const reelForSource = existingReels.find((r) => r.sourceId === source.id);
    if (reelForSource && ["PUBLISHED", "READY", "SCHEDULED", "UPLOADING", "WAITING_FOR_APPROVAL"].includes(reelForSource.state)) {
      log.info("reel already in terminal/active state", { sourceId: source.id, state: reelForSource.state });
      continue;
    }
    try {
      const reel = await createReel({ services, store }, source);
      const advanced = await advanceReel({ services, store }, reel, { approval: settings.approvalMode, outDir: outRoot });
      log.info("pipeline advanced", { reelId: advanced.id, state: advanced.state, qaScore: advanced.qaScore });
      if (advanced.state === "WAITING_FOR_APPROVAL" || advanced.state === "QA_PASSED") {
        // Approval mode gates the final publish below; QA-passed is enough to mark READY.
        await store.updateReel(advanced.id, { state: "READY", updatedAt: nowIso() });
      }
      const ready = (await store.getReel(advanced.id))!;
      const gate = await gateAndPublish(store, publisher, ready, {
        dryRun,
        approvalMode: settings.approvalMode,
        credentialsConfigured: Boolean(env.META_ACCESS_TOKEN && env.META_PAGE_ID) && !mock,
      });
      result.publish.push(gate);
      if (gate.action === "PUBLISHED" || gate.action === "WOULD_PUBLISH") result.ready += 1;
      log.info("publish gate result", { action: gate.action, reason: gate.reason });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      log.error("source pipeline failed", { sourceId: source.id, error: msg });
      const reel = (await store.listReels()).find((r) => r.sourceId === source.id);
      if (reel) {
        await store.updateReel(reel.id, { state: "FAILED", errorMessage: msg, retryCount: reel.retryCount + 1, lastAttemptAt: nowIso() });
      }
    }
  }

  return result;
}

async function main(): Promise<void> {
  loadDotenv();
  const store = createStoreFromEnv(process.env);
  const intervalSec = Number(process.env.WORKER_INTERVAL_SECONDS ?? 60);
  if (intervalSec > 0) {
    log.info("worker daemon starting", { intervalSec, pid: process.pid });
    const run = async () => {
      try {
        const res = await runWorkerOnce({ store });
        log.info("worker cycle complete", { discovered: res.discovered, ready: res.ready, publish: res.publish });
      } catch (err) {
        log.error("worker cycle failed", { error: String(err) });
      }
    };
    await run();
    setInterval(() => void run(), intervalSec * 1000);
    process.title = "viralclip-worker";
  } else {
    const res = await runWorkerOnce({ store });
    log.info("worker cycle complete", { discovered: res.discovered, ready: res.ready, publish: res.publish });
  }
}

if (require.main === module) {
  main().catch((err) => {
    log.error("worker crashed", { error: String(err) });
    process.exit(1);
  });
}

export { runSourceDiscovery, buildServices };
