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

export class InMemoryStore implements Store {
  private sources = new Map<string, SourceVideoRow>();
  private transcripts = new Map<string, TranscriptRow>();
  private moments = new Map<string, MomentRow>();
  private scripts = new Map<string, ScriptRow>();
  private renders = new Map<string, RenderRow>();
  private qas = new Map<string, QaRow>();
  private reels = new Map<string, ReelRow>();
  private jobRuns = new Map<string, JobRunRow>();
  private publishJobs = new Map<string, PublishJobRow>();
  private agentRuns: AgentRunRow[] = [];
  private analytics: AnalyticsRow[] = [];
  private settings: SettingsRow | null = null;

  async saveSource(v: SourceVideoRow): Promise<void> {
    this.sources.set(v.id, { ...v });
  }
  async getSource(id: string): Promise<SourceVideoRow | null> {
    const s = this.sources.get(id);
    return s ? { ...s } : null;
  }
  async findSourceByVideoId(videoId: string): Promise<SourceVideoRow | null> {
    for (const s of this.sources.values()) if (s.youtubeVideoId === videoId) return { ...s };
    return null;
  }
  async listSources(filter?: { status?: string }): Promise<SourceVideoRow[]> {
    const all = [...this.sources.values()];
    return filter?.status ? all.filter((s) => s.status === filter.status) : all;
  }
  async updateSource(id: string, patch: Partial<SourceVideoRow>): Promise<void> {
    const cur = this.sources.get(id);
    if (!cur) return;
    this.sources.set(id, { ...cur, ...patch, updatedAt: new Date().toISOString() });
  }

  async saveTranscript(t: TranscriptRow): Promise<void> {
    this.transcripts.set(t.sourceId, { ...t, segments: t.segments.map((s) => ({ ...s })) });
  }
  async getTranscriptForSource(sourceId: string): Promise<TranscriptRow | null> {
    const t = this.transcripts.get(sourceId);
    return t ? { ...t, segments: t.segments.map((s) => ({ ...s })) } : null;
  }

  async saveMoment(m: MomentRow): Promise<void> {
    this.moments.set(m.id, { ...m });
  }
  async listMomentsForSource(sourceId: string): Promise<MomentRow[]> {
    return [...this.moments.values()].filter((m) => m.sourceId === sourceId);
  }
  async updateMoment(id: string, patch: Partial<MomentRow>): Promise<void> {
    const cur = this.moments.get(id);
    if (!cur) return;
    this.moments.set(id, { ...cur, ...patch, updatedAt: new Date().toISOString() });
  }

  async saveScript(s: ScriptRow): Promise<void> {
    this.scripts.set(s.id, { ...s });
  }
  async getScript(id: string): Promise<ScriptRow | null> {
    const s = this.scripts.get(id);
    return s ? { ...s } : null;
  }
  async listScriptsForMoment(momentId: string): Promise<ScriptRow[]> {
    return [...this.scripts.values()].filter((s) => s.momentId === momentId);
  }
  async updateScript(id: string, patch: Partial<ScriptRow>): Promise<void> {
    const cur = this.scripts.get(id);
    if (!cur) return;
    this.scripts.set(id, { ...cur, ...patch, updatedAt: new Date().toISOString() });
  }

  async saveRender(r: RenderRow): Promise<void> {
    this.renders.set(r.id, { ...r });
  }
  async getRender(id: string): Promise<RenderRow | null> {
    const r = this.renders.get(id);
    return r ? { ...r } : null;
  }
  async listRenders(): Promise<RenderRow[]> {
    return [...this.renders.values()];
  }
  async updateRender(id: string, patch: Partial<RenderRow>): Promise<void> {
    const cur = this.renders.get(id);
    if (!cur) return;
    this.renders.set(id, { ...cur, ...patch, updatedAt: new Date().toISOString() });
  }

  async saveQa(q: QaRow): Promise<void> {
    this.qas.set(q.renderId, { ...q });
  }
  async getQaForRender(renderId: string): Promise<QaRow | null> {
    const q = this.qas.get(renderId);
    return q ? { ...q } : null;
  }

  async saveReel(r: ReelRow): Promise<void> {
    this.reels.set(r.id, { ...r });
  }
  async getReel(id: string): Promise<ReelRow | null> {
    const r = this.reels.get(id);
    return r ? { ...r } : null;
  }
  async listReels(filter?: { state?: string }): Promise<ReelRow[]> {
    const all = [...this.reels.values()];
    return filter?.state ? all.filter((r) => r.state === filter.state) : all;
  }
  async updateReel(id: string, patch: Partial<ReelRow>): Promise<void> {
    const cur = this.reels.get(id);
    if (!cur) return;
    this.reels.set(id, { ...cur, ...patch, updatedAt: new Date().toISOString() });
  }

  async saveJobRun(j: JobRunRow): Promise<void> {
    this.jobRuns.set(j.id, { ...j });
  }
  async getJobRun(id: string): Promise<JobRunRow | null> {
    const j = this.jobRuns.get(id);
    return j ? { ...j } : null;
  }
  async listJobRuns(filter?: { jobName?: string; state?: string }): Promise<JobRunRow[]> {
    let all = [...this.jobRuns.values()];
    if (filter?.jobName) all = all.filter((j) => j.jobName === filter.jobName);
    if (filter?.state) all = all.filter((j) => j.state === filter.state);
    return all;
  }
  async updateJobRun(id: string, patch: Partial<JobRunRow>): Promise<void> {
    const cur = this.jobRuns.get(id);
    if (!cur) return;
    this.jobRuns.set(id, { ...cur, ...patch, updatedAt: new Date().toISOString() });
  }

  async savePublishJob(p: PublishJobRow): Promise<void> {
    this.publishJobs.set(p.id, { ...p });
  }
  async getPublishJob(id: string): Promise<PublishJobRow | null> {
    const p = this.publishJobs.get(id);
    return p ? { ...p } : null;
  }
  async listPublishJobs(filter?: { state?: string }): Promise<PublishJobRow[]> {
    const all = [...this.publishJobs.values()];
    return filter?.state ? all.filter((p) => p.state === filter.state) : all;
  }
  async updatePublishJob(id: string, patch: Partial<PublishJobRow>): Promise<void> {
    const cur = this.publishJobs.get(id);
    if (!cur) return;
    this.publishJobs.set(id, { ...cur, ...patch, updatedAt: new Date().toISOString() });
  }

  async saveAgentRun(r: AgentRunRow): Promise<void> {
    this.agentRuns.push({ ...r });
  }
  async listAgentRuns(limit = 100): Promise<AgentRunRow[]> {
    return this.agentRuns.slice(-limit).reverse();
  }

  async saveAnalytics(a: AnalyticsRow): Promise<void> {
    this.analytics.push({ ...a });
  }
  async listAnalytics(limit = 100): Promise<AnalyticsRow[]> {
    return this.analytics.slice(-limit).reverse();
  }

  async getSettings(): Promise<SettingsRow | null> {
    return this.settings ? { ...this.settings } : null;
  }
  async saveSettings(s: SettingsRow): Promise<void> {
    this.settings = { ...s };
  }
}
