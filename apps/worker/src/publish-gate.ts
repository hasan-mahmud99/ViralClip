import { Store, ReelRow } from "@viralclip/database";
import { nowIso, createLogger } from "@viralclip/shared";
import { PublisherProvider } from "@viralclip/providers";

const log = createLogger("publish");

export interface PublishGateInput {
  dryRun: boolean;
  approvalMode: "manual" | "automatic" | "hybrid";
  credentialsConfigured: boolean;
}

export async function gateAndPublish(
  store: Store,
  publisher: PublisherProvider,
  reel: ReelRow,
  gate: PublishGateInput
): Promise<{ action: "PUBLISHED" | "WOULD_PUBLISH" | "SKIPPED"; reason: string; postId?: string }> {
  const current = (await store.getReel(reel.id)) ?? reel;

  // Preconditions before any publish attempt.
  if (current.state === "PUBLISHED" || current.state === "UPLOADING" || current.state === "SCHEDULED") {
    return { action: "SKIPPED", reason: `already ${current.state}` };
  }
  if (current.state !== "READY") {
    return { action: "SKIPPED", reason: `reel not ready (state=${current.state})` };
  }
  if (current.qaScore === null || current.qaScore === undefined || current.qaScore < 0) {
    return { action: "SKIPPED", reason: "qa not passed" };
  }
  const source = await store.getSource(current.sourceId);
  if (!source || source.status === "BLOCKED") {
    return { action: "SKIPPED", reason: "source not approved/blocked" };
  }
  if (gate.approvalMode === "manual" && gate.dryRun === false) {
    // manual mode requires an explicit approval transition performed via the API first.
    return { action: "SKIPPED", reason: "manual approval required" };
  }
  if (!gate.credentialsConfigured) {
    return { action: "WOULD_PUBLISH", reason: "publisher not configured (no credentials)" };
  }
  if (gate.dryRun) {
    log.info("WOULD_PUBLISH", { reelId: reel.id, reason: "dry-run" });
    await store.updateReel(reel.id, { state: "READY", updatedAt: nowIso() });
    return { action: "WOULD_PUBLISH", reason: "dry-run" };
  }

  await store.updateReel(reel.id, { state: "UPLOADING", lastAttemptAt: nowIso() });
  const result = await publisher.publishVideo({
    filePath: current.renderId ? await fileForReel(store, current) : "",
    caption: current.caption ?? current.title ?? "",
    title: current.title ?? undefined,
    pageId: current.platform === "facebook" ? process.env.META_PAGE_ID ?? undefined : undefined,
  });
  await store.updateReel(reel.id, {
    state: "PUBLISHED",
    publishedAt: nowIso(),
    platformPostId: result.platformPostId,
    updatedAt: nowIso(),
  });
  return { action: "PUBLISHED", reason: "ok", postId: result.platformPostId };
}

async function fileForReel(store: Store, reel: ReelRow): Promise<string> {
  if (reel.renderId) {
    const render = await store.getRender(reel.renderId);
    if (render?.filePath) return render.filePath;
  }
  throw new Error("reel has no rendered file");
}
