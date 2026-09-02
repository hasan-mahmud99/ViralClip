import { createLogger, nowIso, sha256 } from "@viralclip/shared";
import type { Store } from "@viralclip/database";
import type { ReelRow, SourceVideoRow } from "@viralclip/database";
import { ReelPipeline, AgentServices } from "./pipeline";

const log = createLogger("pipeline-runner");

export interface RunContext {
  services: AgentServices;
  store: Store;
}

export interface RunResult {
  reelId: string;
  outputPath?: string;
  qaScore?: number;
}

export async function createReel(
  ctx: RunContext,
  source: SourceVideoRow
): Promise<ReelRow> {
  const id = `reel_${sha256(source.id).slice(0, 18)}`;
  const existing = await ctx.store.getReel(id);
  if (existing) return existing;
  const now = nowIso();
  const reel: ReelRow = {
    id,
    sourceId: source.id,
    sourceCreator: source.creatorName ?? source.channelName ?? null,
    title: source.title,
    state: "DISCOVERED",
    retryCount: 0,
    createdAt: now,
    updatedAt: now,
  };
  await ctx.store.saveReel(reel);
  return reel;
}

export async function advanceReel(
  ctx: RunContext,
  reel: ReelRow,
  opts?: { approval: "manual" | "automatic" | "hybrid"; outDir: string; renderWidth?: number; renderHeight?: number }
): Promise<ReelRow> {
  const { store, services } = ctx;
  const source = await store.getSource(reel.sourceId);
  if (!source) throw new Error(`source ${reel.sourceId} not found`);
  if (!source.localFilePath) throw new Error("source has no ingested media (localFilePath missing)");

  const renderWidth = opts?.renderWidth ?? 1080;
  const renderHeight = opts?.renderHeight ?? 1920;
  const outDir = opts?.outDir ?? "media";

  const pipeline = new ReelPipeline(services, {
    renderWidth,
    renderHeight,
    audioDir: `${outDir}/audio`,
    sourceDir: `${outDir}/sources`,
    subtitleDir: `${outDir}/subtitles`,
    renderDir: `${outDir}/renders`,
  });

  const sourceRecord: Parameters<ReelPipeline["run"]>[0] = {
    id: source.id,
    sourceUrl: source.sourceUrl,
    title: source.title,
    rightsStatus: (source.rightsStatus ?? "UNKNOWN") as never,
    status: (source.status ?? "APPROVED") as never,
    ingestionKind: "LOCAL_FILE",
    localFilePath: source.localFilePath,
    channelName: source.channelName ?? null,
    creatorName: source.creatorName ?? null,
    sourcePlatform: source.sourcePlatform ?? "local",
    discoveredAt: source.createdAt,
    createdAt: source.createdAt,
    updatedAt: source.updatedAt,
  };

  await store.updateReel(reel.id, { state: "TRANSCRIBING", lastAttemptAt: nowIso() });
  log.info("pipeline running", { reelId: reel.id, sourceId: source.id });

  const outputPath = `${outDir}/renders/reel-${Date.now()}.mp4`;
  const { render, qa } = await pipeline.run(sourceRecord, outputPath);

  const nextState = qa.passed ? (opts?.approval === "manual" ? "WAITING_FOR_APPROVAL" : "READY") : "FAILED";
  await store.updateReel(reel.id, {
    state: qa.passed ? "QA_PASSED" : "FAILED",
    renderId: render.id,
    qaScore: qa.score,
    errorMessage: qa.passed ? undefined : "QA failed",
    lastAttemptAt: nowIso(),
  });

  return (await store.getReel(reel.id))!;
}

export async function markReady(ctx: RunContext, reelId: string): Promise<ReelRow> {
  const reel = await ctx.store.getReel(reelId);
  if (!reel) throw new Error(`reel ${reelId} not found`);
  if (reel.state === "QA_PASSED" || reel.state === "WAITING_FOR_APPROVAL") {
    await ctx.store.updateReel(reelId, { state: "READY", updatedAt: nowIso() });
  }
  return (await ctx.store.getReel(reelId))!;
}

export async function markApproved(ctx: RunContext, reelId: string): Promise<ReelRow> {
  await ctx.store.updateReel(reelId, { state: "READY", updatedAt: nowIso() });
  return (await ctx.store.getReel(reelId))!;
}

export async function storeStageArtifacts(ctx: RunContext, reel: ReelRow) {
  // Placeholder: persist structured artifacts once entities exist for the reel.
  // Actual artifact persistence happens inside pipeline.run via services when wired to the store.
  return reel;
}
