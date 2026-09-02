export interface Store {
  saveSource(v: SourceVideoRow): Promise<void>;
  getSource(id: string): Promise<SourceVideoRow | null>;
  findSourceByVideoId(videoId: string): Promise<SourceVideoRow | null>;
  listSources(filter?: { status?: string }): Promise<SourceVideoRow[]>;
  updateSource(id: string, patch: Partial<SourceVideoRow>): Promise<void>;

  saveTranscript(t: TranscriptRow): Promise<void>;
  getTranscriptForSource(sourceId: string): Promise<TranscriptRow | null>;

  saveMoment(m: MomentRow): Promise<void>;
  listMomentsForSource(sourceId: string): Promise<MomentRow[]>;
  updateMoment(id: string, patch: Partial<MomentRow>): Promise<void>;

  saveScript(s: ScriptRow): Promise<void>;
  getScript(id: string): Promise<ScriptRow | null>;
  listScriptsForMoment(momentId: string): Promise<ScriptRow[]>;
  updateScript(id: string, patch: Partial<ScriptRow>): Promise<void>;

  saveRender(r: RenderRow): Promise<void>;
  getRender(id: string): Promise<RenderRow | null>;
  listRenders(): Promise<RenderRow[]>;
  updateRender(id: string, patch: Partial<RenderRow>): Promise<void>;

  saveQa(q: QaRow): Promise<void>;
  getQaForRender(renderId: string): Promise<QaRow | null>;

  saveReel(r: ReelRow): Promise<void>;
  getReel(id: string): Promise<ReelRow | null>;
  listReels(filter?: { state?: string }): Promise<ReelRow[]>;
  updateReel(id: string, patch: Partial<ReelRow>): Promise<void>;

  saveJobRun(j: JobRunRow): Promise<void>;
  getJobRun(id: string): Promise<JobRunRow | null>;
  listJobRuns(filter?: { jobName?: string; state?: string }): Promise<JobRunRow[]>;
  updateJobRun(id: string, patch: Partial<JobRunRow>): Promise<void>;

  savePublishJob(p: PublishJobRow): Promise<void>;
  getPublishJob(id: string): Promise<PublishJobRow | null>;
  listPublishJobs(filter?: { state?: string }): Promise<PublishJobRow[]>;
  updatePublishJob(id: string, patch: Partial<PublishJobRow>): Promise<void>;

  saveAgentRun(r: AgentRunRow): Promise<void>;
  listAgentRuns(limit?: number): Promise<AgentRunRow[]>;

  saveAnalytics(a: AnalyticsRow): Promise<void>;
  listAnalytics(limit?: number): Promise<AnalyticsRow[]>;

  getSettings(): Promise<SettingsRow | null>;
  saveSettings(s: SettingsRow): Promise<void>;
}

export interface SourceVideoRow {
  id: string;
  youtubeVideoId?: string | null;
  sourceUrl: string;
  sourcePlatform?: string | null;
  sourceVideoId?: string | null;
  creatorName?: string | null;
  channelId?: string | null;
  channelName?: string | null;
  title: string;
  description?: string | null;
  durationSec?: number | null;
  rightsStatus: string;
  sourceLicense?: string | null;
  permissionUrl?: string | null;
  rightsNotes?: string | null;
  approvedByUser?: string | null;
  approvedAt?: string | null;
  status: string;
  evaluationScore?: number | null;
  localFilePath?: string | null;
  sourceHash?: string | null;
  discoveryQuery?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface TranscriptRow {
  id: string;
  sourceId: string;
  language: string;
  text: string;
  segments: { start: number; end: number; text: string }[];
  createdAt: string;
}

export interface MomentRow {
  id: string;
  sourceId: string;
  start: number;
  end: number;
  score: number;
  category: string;
  reason: string;
  hook: string;
  status: string;
  clipFingerprint: string;
  createdAt: string;
  updatedAt: string;
}

export interface ScriptRow {
  id: string;
  momentId: string;
  sourceId: string;
  language: string;
  status: string;
  hook: string;
  blocks: { start: number; end: number; kind: string; text: string }[];
  title?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface RenderRow {
  id: string;
  sourceId: string;
  momentId: string;
  scriptId: string;
  filePath?: string | null;
  durationSec?: number | null;
  status: string;
  createdAt: string;
  updatedAt: string;
}

export interface QaRow {
  id: string;
  renderId: string;
  passed: boolean;
  score: number;
  issues: string[];
  createdAt: string;
}

export interface ReelRow {
  id: string;
  sourceId: string;
  sourceCreator?: string | null;
  momentId?: string | null;
  scriptId?: string | null;
  renderId?: string | null;
  title?: string | null;
  caption?: string | null;
  hashtags?: string[];
  state: string; // PipelineStage or WAITING_FOR_APPROVAL
  qaScore?: number | null;
  scheduledFor?: string | null;
  publishedAt?: string | null;
  platform?: string | null;
  platformPostId?: string | null;
  errorCode?: string | null;
  errorMessage?: string | null;
  failedStage?: string | null;
  retryCount: number;
  lastAttemptAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface JobRunRow {
  id: string;
  jobName: string;
  entityId?: string | null;
  state: string; // queued | active | completed | failed | retrying
  errorCode?: string | null;
  errorMessage?: string | null;
  failedStage?: string | null;
  retryCount: number;
  lastAttemptAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface PublishJobRow {
  id: string;
  reelId: string;
  platform: string;
  pageId?: string | null;
  state: string; // queued | scheduled | uploading | published | failed | cancelled
  scheduledFor?: string | null;
  platformPostId?: string | null;
  errorCode?: string | null;
  errorMessage?: string | null;
  retryCount: number;
  lastAttemptAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface AgentRunRow {
  id: string;
  agentName: string;
  model: string;
  promptVersion: string;
  status: string;
  durationMs?: number | null;
  error?: string | null;
  createdAt: string;
}

export interface AnalyticsRow {
  id: string;
  reelId: string;
  platform?: string | null;
  publishedAt?: string | null;
  sourceId: string;
  sourceCreator?: string | null;
  topic?: string | null;
  momentScore?: number | null;
  qaScore?: number | null;
  views?: number | null;
  likes?: number | null;
  comments?: number | null;
  shares?: number | null;
  watchTimeSec?: number | null;
  retentionPct?: number | null;
  createdAt: string;
}

export interface SettingsRow {
  id: string;
  data: Record<string, unknown>;
  updatedAt: string;
}
