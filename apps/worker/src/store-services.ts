import { Store, SourceVideoRow, TranscriptRow, MomentRow, ScriptRow, RenderRow } from "@viralclip/database";
import { sha256, nowIso } from "@viralclip/shared";

export function idFor(prefix: string, payload: string): string {
  return `${prefix}_${sha256(payload).slice(0, 20)}`;
}

export async function getOrSaveSource(store: Store, s: SourceVideoRow): Promise<SourceVideoRow> {
  const existing = await store.getSource(s.id);
  if (existing) return existing;
  await store.saveSource(s);
  return s;
}

export async function persistTranscriptRow(
  store: Store,
  input: { sourceId: string; language: string; text: string; segments: { start: number; end: number; text: string }[] }
): Promise<TranscriptRow> {
  const existing = await store.getTranscriptForSource(input.sourceId);
  if (existing) return existing;
  const row: TranscriptRow = { id: idFor("tr", input.sourceId), ...input, createdAt: nowIso() };
  await store.saveTranscript(row);
  return row;
}

export async function persistMomentRow(
  store: Store,
  input: { sourceId: string; start: number; end: number; score: number; category: string; reason: string; hook: string; clipFingerprint: string }
): Promise<MomentRow> {
  const id = idFor("mom", input.clipFingerprint);
  const existing = (await store.listMomentsForSource(input.sourceId)).find((m) => m.id === id);
  if (existing) return existing;
  const row: MomentRow = { ...input, id, status: "DETECTED", createdAt: nowIso(), updatedAt: nowIso() };
  await store.saveMoment(row);
  return row;
}

export async function persistScriptRow(
  store: Store,
  input: { sourceId: string; momentId: string; language: string; hook: string; title?: string | null; blocks: { start: number; end: number; kind: string; text: string }[] }
): Promise<ScriptRow> {
  const id = idFor("scr", input.momentId);
  const existing = (await store.listScriptsForMoment(input.momentId)).find((s) => s.id === id);
  if (existing) return existing;
  const row: ScriptRow = { ...input, id, title: input.title ?? null, status: "GENERATED", createdAt: nowIso(), updatedAt: nowIso() };
  await store.saveScript(row);
  return row;
}

export async function persistRenderRow(
  store: Store,
  input: { sourceId: string; momentId: string; scriptId: string; filePath: string; durationSec: number }
): Promise<RenderRow> {
  const id = idFor("ren", input.scriptId);
  const row: RenderRow = { ...input, id, status: "RENDERED", createdAt: nowIso(), updatedAt: nowIso() };
  await store.saveRender(row);
  return row;
}

export function toDomainSource(row: SourceVideoRow) {
  return {
    id: row.id,
    sourceUrl: row.sourceUrl,
    title: row.title,
    rightsStatus: (row.rightsStatus ?? "UNKNOWN") as never,
    status: (row.status ?? "DISCOVERED") as never,
    ingestionKind: "LOCAL_FILE" as never,
    localFilePath: row.localFilePath ?? null,
    channelName: row.channelName ?? null,
    creatorName: row.creatorName ?? null,
    sourcePlatform: row.sourcePlatform ?? null,
    discoveredAt: row.createdAt,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}
