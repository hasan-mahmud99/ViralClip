import { Store, SourceVideoRow } from "@viralclip/database";
import { sha256, nowIso, ProviderError } from "@viralclip/shared";
import type { DiscoveryProvider } from "@viralclip/providers";
import { evaluateSourceRights } from "./rights";
import { computeDailyPlan } from "./orchestrator";

export interface DiscoveryInput {
  queries: string[];
  maxResults: number;
  policy: "manual" | "approved_only" | "licensed_only" | "trusted_sources";
  trustedChannels: string[];
}

export async function runSourceDiscovery(
  store: Store,
  discovery: DiscoveryProvider,
  input: DiscoveryInput
): Promise<{ inserted: number; deduped: number; blocked: number }> {
  let inserted = 0;
  let deduped = 0;
  let blocked = 0;

  const candidates = await discovery.search({ queries: input.queries, maxResults: input.maxResults });
  for (const cand of candidates) {
    const existing = await store.findSourceByVideoId(cand.youtubeVideoId);
    if (existing) {
      deduped++;
      continue;
    }
    const now = nowIso();
    const rights = evaluateSourceRights(
      { rightsStatus: "UNKNOWN", creatorName: cand.channelName, channelId: cand.channelId, sourceUrl: cand.sourceUrl, sourcePlatform: "youtube" },
      input.policy,
      input.trustedChannels
    );
    if (rights.nextStatus === "BLOCKED") {
      blocked++;
    }
    const row: SourceVideoRow = {
      id: `src_${sha256(cand.youtubeVideoId).slice(0, 18)}`,
      youtubeVideoId: cand.youtubeVideoId,
      sourceUrl: cand.sourceUrl,
      sourcePlatform: "youtube",
      sourceVideoId: cand.youtubeVideoId,
      creatorName: cand.channelName ?? null,
      channelId: cand.channelId ?? null,
      channelName: cand.channelName ?? null,
      title: cand.title,
      description: cand.description ?? null,
      durationSec: cand.durationSec ?? null,
      rightsStatus: "UNKNOWN",
      status: rights.nextStatus === "APPROVED" ? "APPROVED" : "RIGHTS_PENDING",
      discoveryQuery: cand.query,
      sourceHash: sha256(cand.youtubeVideoId),
      createdAt: now,
      updatedAt: now,
    };
    await store.saveSource(row);
    inserted++;
  }
  return { inserted, deduped, blocked };
}

export async function approveSource(store: Store, sourceId: string, user: string): Promise<SourceVideoRow | null> {
  const source = await store.getSource(sourceId);
  if (!source) return null;
  const approved = {
    ...source,
    rightsStatus: "USER_APPROVED",
    status: "APPROVED",
    approvedByUser: user,
    approvedAt: nowIso(),
    updatedAt: nowIso(),
  };
  await store.saveSource(approved);
  return approved;
}

export async function blockSource(store: Store, sourceId: string, reason?: string): Promise<SourceVideoRow | null> {
  const source = await store.getSource(sourceId);
  if (!source) return null;
  const blocked = {
    ...source,
    rightsStatus: "BLOCKED",
    status: "BLOCKED",
    rightsNotes: reason ?? source.rightsNotes,
    updatedAt: nowIso(),
  };
  await store.saveSource(blocked);
  return blocked;
}

export { computeDailyPlan };
