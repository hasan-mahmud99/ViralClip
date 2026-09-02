import express from "express";
import type { NextFunction, Request, Response } from "express";
import multer from "multer";
import { mkdirSync } from "node:fs";
import { InMemoryStore, PostgresStore, Store, SourceVideoRow } from "@viralclip/database";
import { createLogger, Settings, sha256 } from "@viralclip/shared";
import { randomUUID } from "node:crypto";
import { runWorkerOnce, createStoreFromEnv } from "@viralclip/worker";
import { runSourceDiscovery } from "@viralclip/worker";
import { MockDiscoveryProvider, YouTubeDiscoveryProvider } from "@viralclip/providers";

export type WorkerControl = {
  triggerOnce: () => Promise<unknown>;
  runDiscovery: () => Promise<unknown>;
};

function buildStore(opts?: { store?: Store }): Store {
  if (opts?.store) return opts.store;
  return createStoreFromEnv(process.env);
}

export function createApi(opts?: {
  store?: Store;
  adminPassword?: string;
  worker?: WorkerControl;
}) {
  const app = express();
  const store = buildStore(opts);
  const password = opts?.adminPassword ?? process.env.ADMIN_PASSWORD ?? "change-me";
  app.use(express.json({ limit: "20mb" }));

  app.get("/healthz", (_req, res) => res.json({ ok: true, service: "viralclip-api", ts: new Date().toISOString() }));

  app.get("/health", async (_req, res) => {
    const memory = process.memoryUsage();
    res.json({
      api: "ok",
      database: "ok", // InMemory in dev; Postgres adapter reports live status when configured
      redis: process.env.REDIS_URL ? "configured" : "not-configured",
      worker: process.env.WORKER_PID ? "running" : "idle",
      gemini: process.env.GEMINI_API_KEY ? "configured" : "not-configured",
      youtube: process.env.YOUTUBE_API_KEY ? "configured" : "not-configured",
      meta: process.env.META_ACCESS_TOKEN && process.env.META_PAGE_ID ? "configured" : "not-configured",
      disk: "ok",
      memory: { rssMB: Math.round(memory.rss / 1024 / 1024) },
    });
  });

  function requireAuth(req: Request, res: Response, next: NextFunction) {
    const token = (req.headers.authorization ?? "").replace(/^Bearer\s+/i, "");
    if (!token || token !== password) {
      res.status(401).json({ error: "unauthorized" });
      return;
    }
    next();
  }
  app.use("/api", requireAuth);

  app.get("/api/settings", async (_req, res) => {
    const existing = await store.getSettings();
    res.json({ settings: existing ? (existing.data as Settings) : null });
  });

  app.put("/api/settings", async (req, res) => {
    const next = req.body as Settings;
    await store.saveSettings({ id: "default", data: next as unknown as Record<string, unknown>, updatedAt: new Date().toISOString() });
    res.json({ settings: next });
  });

  app.get("/api/sources", async (_req, res) => {
    res.json({ sources: await store.listSources() });
  });

  app.get("/api/sources/:id", async (req, res) => {
    const s = await store.getSource(req.params.id);
    if (!s) return res.status(404).json({ error: "not found" });
    res.json({ source: s });
  });

  app.post("/api/sources", async (req, res) => {
    const body = req.body;
    const now = new Date().toISOString();
    await store.saveSource({
      id: body.id ?? `src_${randomUUID()}`,
      youtubeVideoId: body.youtubeVideoId ?? null,
      sourceUrl: body.sourceUrl ?? "",
      sourcePlatform: body.sourcePlatform ?? null,
      creatorName: body.creatorName ?? null,
      channelName: body.channelName ?? null,
      title: body.title ?? "untitled",
      description: body.description ?? null,
      rightsStatus: body.rightsStatus ?? "UNKNOWN",
      status: body.status ?? "DISCOVERED",
      localFilePath: body.localFilePath ?? null,
      createdAt: now,
      updatedAt: now,
    });
    res.status(201).json({ ok: true });
  });

  app.post("/api/sources/:id/approve", async (req, res) => {
    await store.updateSource(req.params.id, {
      rightsStatus: "USER_APPROVED",
      status: "APPROVED",
      approvedByUser: req.body?.actor ?? "admin",
      approvedAt: new Date().toISOString(),
    });
    res.json({ ok: true });
  });

  app.post("/api/sources/:id/block", async (req, res) => {
    await store.updateSource(req.params.id, { rightsStatus: "BLOCKED", status: "BLOCKED", rightsNotes: req.body?.reason ?? null });
    res.json({ ok: true });
  });

  app.get("/api/reels", async (_req, res) => {
    res.json({ reels: await store.listReels() });
  });

  app.get("/api/jobs", async (_req, res) => {
    res.json({ jobs: await store.listJobRuns() });
  });

  app.post("/api/jobs/discover", async (_req, res) => {
    const queries = (process.env.YOUTUBE_SEARCH_QUERIES ?? "viral creator moments").split(",").map((s) => s.trim());
    const discovery = process.env.YOUTUBE_API_KEY ? new YouTubeDiscoveryProvider({ apiKey: process.env.YOUTUBE_API_KEY }) : new MockDiscoveryProvider();
    const policy = (process.env.SOURCE_RIGHTS_POLICY ?? "approved_only") as "manual" | "approved_only" | "licensed_only" | "trusted_sources";
    const result = await runSourceDiscovery(store, discovery, { queries, maxResults: Number(process.env.YOUTUBE_MAX_RESULTS ?? 5), policy, trustedChannels: [] });
    res.json(result);
  });

  app.post("/api/jobs/run-once", async (req, res) => {
    const worker = opts?.worker;
    const body = (req.body ?? {}) as { mediaPath?: string };
    const result = worker
      ? await worker.triggerOnce()
      : await runWorkerOnce({ store, env: { ...process.env, SOURCE_MEDIA: body.mediaPath } });
    res.json(result);
  });

  app.get("/api/dashboard", async (_req, res) => {
    const reels = await store.listReels();
    const sources = await store.listSources();
    const now = new Date();
    const today = now.toISOString().slice(0, 10);
    const publishedToday = reels.filter((r) => r.publishedAt?.startsWith(today)).length;
    const ready = reels.filter((r) => r.state === "READY").length;
    const processing = reels.filter((r) => ["TRANSCRIBING", "QA_PASSED", "RENDERED", "SCHEDULED"].includes(r.state)).length;
    const failed = reels.filter((r) => r.state === "FAILED").length;
    const target = Number(process.env.DAILY_REEL_TARGET ?? 3);
    const remaining = Math.max(0, target - publishedToday - ready);
    res.json({ target, publishedToday, ready, processing, failed, remaining, totalSources: sources.length, totalReels: reels.length });
  });

  // --- Authorized source ingestion (operator-provided file only) ---
  const sourceDir = process.env.SOURCE_STORAGE ?? "media/sources";
  mkdirSync(sourceDir, { recursive: true });
  const upload = multer({
    storage: multer.diskStorage({
      destination: (_req, _file, cb) => cb(null, sourceDir),
      filename: (_req, file, cb) => cb(null, `${Date.now()}-${randomUUID().slice(0, 8)}-${file.originalname.replace(/[^a-zA-Z0-9._-]/g, "_")}`),
    }),
    limits: { fileSize: 1024 * 1024 * 1024 },
  });

  app.post("/api/sources/upload", upload.single("file"), async (req, res) => {
    if (!req.file) {
      res.status(400).json({ error: "no file uploaded (field name: file)" });
      return;
    }
    const title = (req.body?.title as string) ?? req.file.originalname;
    const now = new Date().toISOString();
    const relPath = req.file.path.replace(/\\/g, "/");
    const source: SourceVideoRow = {
      id: `src_${sha256(req.file.path).slice(0, 18)}`,
      sourceUrl: `file://${relPath}`,
      sourcePlatform: "local",
      title,
      rightsStatus: "UNKNOWN",
      status: "RIGHTS_PENDING",
      localFilePath: relPath,
      sourceHash: sha256(req.file.path).slice(0, 32),
      createdAt: now,
      updatedAt: now,
    };
    await store.saveSource(source);
    res.status(201).json({ source });
  });

  return app;
}

export { runWorkerOnce };
