import { Pool } from "pg";
import {
  Store,
  SourceVideoRow,
  TranscriptRow,
  MomentRow,
  ScriptRow,
  RenderRow,
  QaRow,
  ReelRow,
  JobRunRow,
  PublishJobRow,
  AgentRunRow,
  AnalyticsRow,
  SettingsRow,
} from "./store";

export class PostgresStore implements Store {
  private pool: Pool;
  constructor(connectionString: string) {
    this.pool = new Pool({ connectionString });
  }
  async close(): Promise<void> {
    await this.pool.end();
  }

  private async q<T = unknown>(text: string, params: unknown[] = []): Promise<T> {
    const res = await this.pool.query(text, params as never[]);
    return res.rows as T;
  }

  private rowToSource(r: Record<string, unknown>): SourceVideoRow {
    return {
      id: String(r.id),
      youtubeVideoId: (r.youtube_video_id as string) ?? null,
      sourceUrl: String(r.source_url),
      sourcePlatform: (r.source_platform as string) ?? null,
      sourceVideoId: (r.source_video_id as string) ?? null,
      creatorName: (r.creator_name as string) ?? null,
      channelId: (r.channel_id as string) ?? null,
      channelName: (r.channel_name as string) ?? null,
      title: String(r.title),
      description: (r.description as string) ?? null,
      durationSec: r.duration_sec != null ? Number(r.duration_sec) : null,
      rightsStatus: String(r.rights_status),
      sourceLicense: (r.source_license as string) ?? null,
      permissionUrl: (r.permission_url as string) ?? null,
      rightsNotes: (r.rights_notes as string) ?? null,
      approvedByUser: (r.approved_by_user as string) ?? null,
      approvedAt: (r.approved_at as string) ?? null,
      status: String(r.status),
      evaluationScore: r.evaluation_score != null ? Number(r.evaluation_score) : null,
      localFilePath: (r.local_file_path as string) ?? null,
      sourceHash: (r.source_hash as string) ?? null,
      discoveryQuery: (r.discovery_query as string) ?? null,
      createdAt: new Date(r.created_at as string).toISOString(),
      updatedAt: new Date(r.updated_at as string).toISOString(),
    };
  }

  async saveSource(v: SourceVideoRow): Promise<void> {
    await this.q(
      `INSERT INTO source_videos (
        id,youtube_video_id,source_url,source_platform,source_video_id,creator_name,channel_id,channel_name,
        title,description,duration_sec,rights_status,source_license,permission_url,rights_notes,approved_by_user,
        approved_at,status,evaluation_score,local_file_path,source_hash,discovery_query,created_at,updated_at
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23,$24)
      ON CONFLICT (id) DO UPDATE SET title=EXCLUDED.title, description=EXCLUDED.description,
        rights_status=EXCLUDED.rights_status, status=EXCLUDED.status, local_file_path=EXCLUDED.local_file_path,
        evaluation_score=EXCLUDED.evaluation_score, updated_at=now()`,
      [
        v.id, v.youtubeVideoId ?? null, v.sourceUrl, v.sourcePlatform ?? null, v.sourceVideoId ?? null,
        v.creatorName ?? null, v.channelId ?? null, v.channelName ?? null, v.title, v.description ?? null,
        v.durationSec ?? null, v.rightsStatus, v.sourceLicense ?? null, v.permissionUrl ?? null,
        v.rightsNotes ?? null, v.approvedByUser ?? null, v.approvedAt ?? null, v.status,
        v.evaluationScore ?? null, v.localFilePath ?? null, v.sourceHash ?? null, v.discoveryQuery ?? null,
        v.createdAt, v.updatedAt,
      ]
    );
  }
  async getSource(id: string): Promise<SourceVideoRow | null> {
    const rows = await this.q<Record<string, unknown>[]>("SELECT * FROM source_videos WHERE id=$1", [id]);
    return rows[0] ? this.rowToSource(rows[0]) : null;
  }
  async findSourceByVideoId(videoId: string): Promise<SourceVideoRow | null> {
    const rows = await this.q<Record<string, unknown>[]>("SELECT * FROM source_videos WHERE youtube_video_id=$1", [videoId]);
    return rows[0] ? this.rowToSource(rows[0]) : null;
  }
  async listSources(filter?: { status?: string }): Promise<SourceVideoRow[]> {
    const rows = filter?.status
      ? await this.q<Record<string, unknown>[]>("SELECT * FROM source_videos WHERE status=$1 ORDER BY created_at DESC", [filter.status])
      : await this.q<Record<string, unknown>[]>("SELECT * FROM source_videos ORDER BY created_at DESC");
    return rows.map((r) => this.rowToSource(r));
  }
  async updateSource(id: string, patch: Partial<SourceVideoRow>): Promise<void> {
    const cur = await this.getSource(id);
    if (!cur) return;
    await this.saveSource({ ...cur, ...patch });
  }

  async saveTranscript(t: TranscriptRow): Promise<void> {
    await this.q(
      `INSERT INTO transcripts (id,source_id,language,text,segments,created_at)
       VALUES ($1,$2,$3,$4,$5,$6)
       ON CONFLICT (source_id) DO UPDATE SET language=EXCLUDED.language, text=EXCLUDED.text, segments=EXCLUDED.segments`,
      [t.id, t.sourceId, t.language, t.text, JSON.stringify(t.segments), t.createdAt]
    );
  }
  async getTranscriptForSource(sourceId: string): Promise<TranscriptRow | null> {
    const rows = await this.q<Record<string, unknown>[]>("SELECT * FROM transcripts WHERE source_id=$1", [sourceId]);
    if (!rows[0]) return null;
    return {
      id: String(rows[0].id),
      sourceId: String(rows[0].source_id),
      language: String(rows[0].language),
      text: String(rows[0].text),
      segments: (rows[0].segments ?? []) as { start: number; end: number; text: string }[],
      createdAt: new Date(rows[0].created_at as string).toISOString(),
    };
  }

  async saveMoment(m: MomentRow): Promise<void> {
    await this.q(
      `INSERT INTO moments (id,source_id,start,"end",score,category,reason,hook,status,clip_fingerprint,created_at,updated_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
       ON CONFLICT (id) DO UPDATE SET status=EXCLUDED.status, updated_at=now()`,
      [m.id, m.sourceId, m.start, m.end, m.score, m.category, m.reason, m.hook, m.status, m.clipFingerprint, m.createdAt, m.updatedAt]
    );
  }
  async listMomentsForSource(sourceId: string): Promise<MomentRow[]> {
    const rows = await this.q<Record<string, unknown>[]>("SELECT * FROM moments WHERE source_id=$1", [sourceId]);
    return rows.map((r) => ({
      id: String(r.id), sourceId: String(r.source_id), start: Number(r.start), end: Number(r.end), score: Number(r.score),
      category: String(r.category), reason: String(r.reason), hook: String(r.hook), status: String(r.status),
      clipFingerprint: String(r.clip_fingerprint), createdAt: new Date(r.created_at as string).toISOString(), updatedAt: new Date(r.updated_at as string).toISOString(),
    }));
  }
  async updateMoment(id: string, patch: Partial<MomentRow>): Promise<void> {
    const cur = (await this.listMomentsForSource(""))[0]; // not used by pipeline currently
    void cur;
    await this.q('UPDATE moments SET status=COALESCE($2,status), "end"=COALESCE($3,"end"), updated_at=now() WHERE id=$1', [id, patch.status ?? null, patch.end ?? null]);
  }

  async saveScript(s: ScriptRow): Promise<void> {
    await this.q(
      `INSERT INTO scripts (id,source_id,moment_id,language,status,hook,blocks,title,created_at,updated_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
       ON CONFLICT (id) DO UPDATE SET status=EXCLUDED.status, blocks=EXCLUDED.blocks, updated_at=now()`,
      [s.id, s.sourceId, s.momentId, s.language, s.status, s.hook, JSON.stringify(s.blocks), s.title ?? null, s.createdAt, s.updatedAt]
    );
  }
  async getScript(id: string): Promise<ScriptRow | null> {
    const rows = await this.q<Record<string, unknown>[]>("SELECT * FROM scripts WHERE id=$1", [id]);
    if (!rows[0]) return null;
    return {
      id: String(rows[0].id), momentId: String(rows[0].moment_id), sourceId: String(rows[0].source_id),
      language: String(rows[0].language), status: String(rows[0].status), hook: String(rows[0].hook),
      blocks: (rows[0].blocks ?? []) as ScriptRow["blocks"], title: (rows[0].title as string) ?? null,
      createdAt: new Date(rows[0].created_at as string).toISOString(), updatedAt: new Date(rows[0].updated_at as string).toISOString(),
    };
  }
  async listScriptsForMoment(momentId: string): Promise<ScriptRow[]> {
    const rows = await this.q<Record<string, unknown>[]>("SELECT * FROM scripts WHERE moment_id=$1", [momentId]);
    return rows.map((r) => ({
      id: String(r.id), momentId: String(r.moment_id), sourceId: String(r.source_id), language: String(r.language), status: String(r.status),
      hook: String(r.hook), blocks: (r.blocks ?? []) as ScriptRow["blocks"], title: (r.title as string) ?? null,
      createdAt: new Date(r.created_at as string).toISOString(), updatedAt: new Date(r.updated_at as string).toISOString(),
    }));
  }
  async updateScript(id: string, patch: Partial<ScriptRow>): Promise<void> {
    const cur = await this.getScript(id);
    if (!cur) return;
    await this.saveScript({ ...cur, ...patch });
  }

  async saveRender(r: RenderRow): Promise<void> {
    await this.q(
      `INSERT INTO renders (id,source_id,moment_id,script_id,file_path,duration_sec,status,created_at,updated_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) ON CONFLICT (id) DO UPDATE SET status=EXCLUDED.status, file_path=EXCLUDED.file_path`,
      [r.id, r.sourceId, r.momentId, r.scriptId, r.filePath ?? null, r.durationSec ?? null, r.status, r.createdAt, r.updatedAt]
    );
  }
  async getRender(id: string): Promise<RenderRow | null> {
    const rows = await this.q<Record<string, unknown>[]>("SELECT * FROM renders WHERE id=$1", [id]);
    if (!rows[0]) return null;
    return {
      id: String(rows[0].id), sourceId: String(rows[0].source_id), momentId: String(rows[0].moment_id), scriptId: String(rows[0].script_id),
      filePath: (rows[0].file_path as string) ?? null, durationSec: rows[0].duration_sec != null ? Number(rows[0].duration_sec) : null,
      status: String(rows[0].status), createdAt: new Date(rows[0].created_at as string).toISOString(), updatedAt: new Date(rows[0].updated_at as string).toISOString(),
    };
  }
  async listRenders(): Promise<RenderRow[]> {
    const rows = await this.q<Record<string, unknown>[]>("SELECT * FROM renders ORDER BY created_at DESC");
    return rows.map((r) => ({
      id: String(r.id), sourceId: String(r.source_id), momentId: String(r.moment_id), scriptId: String(r.script_id),
      filePath: (r.file_path as string) ?? null, durationSec: r.duration_sec != null ? Number(r.duration_sec) : null, status: String(r.status),
      createdAt: new Date(r.created_at as string).toISOString(), updatedAt: new Date(r.updated_at as string).toISOString(),
    }));
  }
  async updateRender(id: string, patch: Partial<RenderRow>): Promise<void> {
    const cur = await this.getRender(id);
    if (!cur) return;
    await this.saveRender({ ...cur, ...patch });
  }

  async saveQa(q: QaRow): Promise<void> {
    await this.q(
      `INSERT INTO qa_results (id,render_id,passed,score,issues,created_at) VALUES ($1,$2,$3,$4,$5,$6)
       ON CONFLICT (render_id) DO UPDATE SET passed=EXCLUDED.passed, score=EXCLUDED.score, issues=EXCLUDED.issues`,
      [q.id, q.renderId, q.passed, q.score, JSON.stringify(q.issues), q.createdAt]
    );
  }
  async getQaForRender(renderId: string): Promise<QaRow | null> {
    const rows = await this.q<Record<string, unknown>[]>("SELECT * FROM qa_results WHERE render_id=$1", [renderId]);
    if (!rows[0]) return null;
    return {
      id: String(rows[0].id), renderId: String(rows[0].render_id), passed: Boolean(rows[0].passed), score: Number(rows[0].score),
      issues: (rows[0].issues ?? []) as string[], createdAt: new Date(rows[0].created_at as string).toISOString(),
    };
  }

  async saveReel(r: ReelRow): Promise<void> {
    await this.q(
      `INSERT INTO reels (id,source_id,source_creator,moment_id,script_id,render_id,title,caption,hashtags,state,qa_score,scheduled_for,published_at,platform,platform_post_id,error_code,error_message,failed_stage,retry_count,last_attempt_at,created_at,updated_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22)
       ON CONFLICT (id) DO UPDATE SET state=EXCLUDED.state, qa_score=EXCLUDED.qa_score, scheduled_for=EXCLUDED.scheduled_for,
         published_at=EXCLUDED.published_at, platform_post_id=EXCLUDED.platform_post_id, error_code=EXCLUDED.error_code,
         error_message=EXCLUDED.error_message, retry_count=EXCLUDED.retry_count, updated_at=now()`,
      [
        r.id, r.sourceId, r.sourceCreator ?? null, r.momentId ?? null, r.scriptId ?? null, r.renderId ?? null, r.title ?? null,
        r.caption ?? null, JSON.stringify(r.hashtags ?? []), r.state, r.qaScore ?? null, r.scheduledFor ?? null, r.publishedAt ?? null,
        r.platform ?? null, r.platformPostId ?? null, r.errorCode ?? null, r.errorMessage ?? null, r.failedStage ?? null,
        r.retryCount, r.lastAttemptAt ?? null, r.createdAt, r.updatedAt,
      ]
    );
  }
  async getReel(id: string): Promise<ReelRow | null> {
    const rows = await this.q<Record<string, unknown>[]>("SELECT * FROM reels WHERE id=$1", [id]);
    if (!rows[0]) return null;
    return this.rowToReel(rows[0]);
  }
  async listReels(filter?: { state?: string }): Promise<ReelRow[]> {
    const rows = filter?.state
      ? await this.q<Record<string, unknown>[]>("SELECT * FROM reels WHERE state=$1 ORDER BY created_at DESC", [filter.state])
      : await this.q<Record<string, unknown>[]>("SELECT * FROM reels ORDER BY created_at DESC");
    return rows.map((r) => this.rowToReel(r));
  }
  async updateReel(id: string, patch: Partial<ReelRow>): Promise<void> {
    const cur = await this.getReel(id);
    if (!cur) return;
    await this.saveReel({ ...cur, ...patch });
  }
  private rowToReel(r: Record<string, unknown>): ReelRow {
    return {
      id: String(r.id), sourceId: String(r.source_id), sourceCreator: (r.source_creator as string) ?? null,
      momentId: (r.moment_id as string) ?? null, scriptId: (r.script_id as string) ?? null, renderId: (r.render_id as string) ?? null,
      title: (r.title as string) ?? null, caption: (r.caption as string) ?? null, hashtags: (r.hashtags ?? []) as string[],
      state: String(r.state), qaScore: r.qa_score != null ? Number(r.qa_score) : null, scheduledFor: (r.scheduled_for as string) ?? null,
      publishedAt: (r.published_at as string) ?? null, platform: (r.platform as string) ?? null, platformPostId: (r.platform_post_id as string) ?? null,
      errorCode: (r.error_code as string) ?? null, errorMessage: (r.error_message as string) ?? null, failedStage: (r.failed_stage as string) ?? null,
      retryCount: Number(r.retry_count ?? 0), lastAttemptAt: (r.last_attempt_at as string) ?? null,
      createdAt: new Date(r.created_at as string).toISOString(), updatedAt: new Date(r.updated_at as string).toISOString(),
    };
  }

  async saveJobRun(j: JobRunRow): Promise<void> {
    await this.q(
      `INSERT INTO job_runs (id,job_name,entity_id,state,error_code,error_message,failed_stage,retry_count,last_attempt_at,created_at,updated_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
       ON CONFLICT (id) DO UPDATE SET state=EXCLUDED.state, error_code=EXCLUDED.error_code, error_message=EXCLUDED.error_message, retry_count=EXCLUDED.retry_count, updated_at=now()`,
      [j.id, j.jobName, j.entityId ?? null, j.state, j.errorCode ?? null, j.errorMessage ?? null, j.failedStage ?? null, j.retryCount, j.lastAttemptAt ?? null, j.createdAt, j.updatedAt]
    );
  }
  async getJobRun(id: string): Promise<JobRunRow | null> {
    const rows = await this.q<Record<string, unknown>[]>("SELECT * FROM job_runs WHERE id=$1", [id]);
    if (!rows[0]) return null;
    return this.rowToJob(rows[0]);
  }
  async listJobRuns(filter?: { jobName?: string; state?: string }): Promise<JobRunRow[]> {
    const cond: string[] = [];
    const params: unknown[] = [];
    if (filter?.jobName) { params.push(filter.jobName); cond.push(`job_name=$${params.length}`); }
    if (filter?.state) { params.push(filter.state); cond.push(`state=$${params.length}`); }
    const where = cond.length ? `WHERE ${cond.join(" AND ")}` : "";
    const rows = await this.q<Record<string, unknown>[]>(`SELECT * FROM job_runs ${where} ORDER BY created_at DESC`);
    return rows.map((r) => this.rowToJob(r));
  }
  async updateJobRun(id: string, patch: Partial<JobRunRow>): Promise<void> {
    const cur = await this.getJobRun(id);
    if (!cur) return;
    await this.saveJobRun({ ...cur, ...patch });
  }
  private rowToJob(r: Record<string, unknown>): JobRunRow {
    return {
      id: String(r.id), jobName: String(r.job_name), entityId: (r.entity_id as string) ?? null, state: String(r.state),
      errorCode: (r.error_code as string) ?? null, errorMessage: (r.error_message as string) ?? null, failedStage: (r.failed_stage as string) ?? null,
      retryCount: Number(r.retry_count ?? 0), lastAttemptAt: (r.last_attempt_at as string) ?? null,
      createdAt: new Date(r.created_at as string).toISOString(), updatedAt: new Date(r.updated_at as string).toISOString(),
    };
  }

  async savePublishJob(p: PublishJobRow): Promise<void> {
    await this.q(
      `INSERT INTO publish_jobs (id,reel_id,platform,page_id,state,scheduled_for,platform_post_id,error_code,error_message,retry_count,last_attempt_at,created_at,updated_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)
       ON CONFLICT (id) DO UPDATE SET state=EXCLUDED.state, platform_post_id=EXCLUDED.platform_post_id, error_code=EXCLUDED.error_code, error_message=EXCLUDED.error_message, retry_count=EXCLUDED.retry_count, updated_at=now()`,
      [p.id, p.reelId, p.platform, p.pageId ?? null, p.state, p.scheduledFor ?? null, p.platformPostId ?? null, p.errorCode ?? null, p.errorMessage ?? null, p.retryCount, p.lastAttemptAt ?? null, p.createdAt, p.updatedAt]
    );
  }
  async getPublishJob(id: string): Promise<PublishJobRow | null> {
    const rows = await this.q<Record<string, unknown>[]>("SELECT * FROM publish_jobs WHERE id=$1", [id]);
    if (!rows[0]) return null;
    return this.rowToPub(rows[0]);
  }
  async listPublishJobs(filter?: { state?: string }): Promise<PublishJobRow[]> {
    const rows = filter?.state
      ? await this.q<Record<string, unknown>[]>("SELECT * FROM publish_jobs WHERE state=$1 ORDER BY created_at DESC", [filter.state])
      : await this.q<Record<string, unknown>[]>("SELECT * FROM publish_jobs ORDER BY created_at DESC");
    return rows.map((r) => this.rowToPub(r));
  }
  async updatePublishJob(id: string, patch: Partial<PublishJobRow>): Promise<void> {
    const cur = await this.getPublishJob(id);
    if (!cur) return;
    await this.savePublishJob({ ...cur, ...patch });
  }
  private rowToPub(r: Record<string, unknown>): PublishJobRow {
    return {
      id: String(r.id), reelId: String(r.reel_id), platform: String(r.platform), pageId: (r.page_id as string) ?? null, state: String(r.state),
      scheduledFor: (r.scheduled_for as string) ?? null, platformPostId: (r.platform_post_id as string) ?? null,
      errorCode: (r.error_code as string) ?? null, errorMessage: (r.error_message as string) ?? null, retryCount: Number(r.retry_count ?? 0),
      lastAttemptAt: (r.last_attempt_at as string) ?? null, createdAt: new Date(r.created_at as string).toISOString(), updatedAt: new Date(r.updated_at as string).toISOString(),
    };
  }

  async saveAgentRun(r: AgentRunRow): Promise<void> {
    await this.q(
      `INSERT INTO agent_runs (id,agent_name,model,prompt_version,status,duration_ms,error,created_at) VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
      [r.id, r.agentName, r.model, r.promptVersion, r.status, r.durationMs ?? null, r.error ?? null, r.createdAt]
    );
  }
  async listAgentRuns(limit = 100): Promise<AgentRunRow[]> {
    const rows = await this.q<Record<string, unknown>[]>(`SELECT * FROM agent_runs ORDER BY created_at DESC LIMIT $1`, [limit]);
    return rows.map((r) => ({
      id: String(r.id), agentName: String(r.agent_name), model: String(r.model), promptVersion: String(r.prompt_version),
      status: String(r.status), durationMs: r.duration_ms != null ? Number(r.duration_ms) : null, error: (r.error as string) ?? null,
      createdAt: new Date(r.created_at as string).toISOString(),
    }));
  }

  async saveAnalytics(a: AnalyticsRow): Promise<void> {
    await this.q(
      `INSERT INTO analytics_snapshots (id,reel_id,platform,published_at,source_id,source_creator,topic,moment_score,qa_score,views,likes,comments,shares,watch_time_sec,retention_pct,created_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16)`,
      [a.id, a.reelId, a.platform ?? null, a.publishedAt ?? null, a.sourceId, a.sourceCreator ?? null, a.topic ?? null, a.momentScore ?? null, a.qaScore ?? null, a.views ?? null, a.likes ?? null, a.comments ?? null, a.shares ?? null, a.watchTimeSec ?? null, a.retentionPct ?? null, a.createdAt]
    );
  }
  async listAnalytics(limit = 100): Promise<AnalyticsRow[]> {
    const rows = await this.q<Record<string, unknown>[]>(`SELECT * FROM analytics_snapshots ORDER BY created_at DESC LIMIT $1`, [limit]);
    return rows.map((r) => ({
      id: String(r.id), reelId: String(r.reel_id), platform: (r.platform as string) ?? null, publishedAt: (r.published_at as string) ?? null,
      sourceId: String(r.source_id), sourceCreator: (r.source_creator as string) ?? null, topic: (r.topic as string) ?? null,
      momentScore: r.moment_score != null ? Number(r.moment_score) : null, qaScore: r.qa_score != null ? Number(r.qa_score) : null,
      views: r.views != null ? Number(r.views) : null, likes: r.likes != null ? Number(r.likes) : null,
      comments: r.comments != null ? Number(r.comments) : null, shares: r.shares != null ? Number(r.shares) : null,
      watchTimeSec: r.watch_time_sec != null ? Number(r.watch_time_sec) : null, retentionPct: r.retention_pct != null ? Number(r.retention_pct) : null,
      createdAt: new Date(r.created_at as string).toISOString(),
    }));
  }

  async getSettings(): Promise<SettingsRow | null> {
    const rows = await this.q<Record<string, unknown>[]>("SELECT * FROM settings WHERE id='default'");
    if (!rows[0]) return null;
    return {
      id: String(rows[0].id),
      data: (rows[0].data ?? {}) as Record<string, unknown>,
      updatedAt: new Date(rows[0].updated_at as string).toISOString(),
    };
  }
  async saveSettings(s: SettingsRow): Promise<void> {
    await this.q(
      `INSERT INTO settings (id,data,updated_at) VALUES ('default',$1,$2)
       ON CONFLICT (id) DO UPDATE SET data=EXCLUDED.data, updated_at=now()`,
      [JSON.stringify(s.data), s.updatedAt]
    );
  }
}
