/** Domain entity types (DB rows + service records). */
import type {
  CommentaryLanguage,
  IngestionKind,
  MomentStatus,
  PublishingStatus,
  RenderStatus,
  ScriptStatus,
  SourceProcessingStatus,
  SourceRightsStatus,
} from "./enums";

export type { CommentaryLanguage };

export interface SourceVideo {
  id: string;
  youtubeVideoId?: string | null;
  sourceUrl: string;
  channelId?: string | null;
  channelName?: string | null;
  title: string;
  description?: string | null;
  publishedAt?: string | null;
  durationSec?: number | null;
  thumbnailUrl?: string | null;
  language?: string | null;
  discoveryQuery?: string | null;
  discoveredAt: string;
  ingestionKind: IngestionKind | null;
  localFilePath?: string | null;

  rightsStatus: SourceRightsStatus;
  sourceLicense?: string | null;
  permissionUrl?: string | null;
  creatorName?: string | null;
  sourcePlatform?: string | null;
  rightsNotes?: string | null;
  approvedByUser?: string | null;
  approvedAt?: string | null;

  status: SourceProcessingStatus;
  evaluationScore?: number | null;
  category?: string | null;
  evaluationReason?: string | null;

  createdAt: string;
  updatedAt: string;
}

export interface TranscriptSegment {
  start: number;
  end: number;
  text: string;
}

export interface Transcript {
  id: string;
  sourceId: string;
  language: string;
  text: string;
  segments: TranscriptSegment[];
  createdAt: string;
}

export interface Moment {
  id: string;
  sourceId: string;
  start: number;
  end: number;
  score: number;
  category: string;
  reason: string;
  hook: string;
  status: MomentStatus;
  clipFingerprint: string;
  createdAt: string;
  updatedAt: string;
}

export interface CommentaryBlock {
  start: number;
  end: number;
  kind: "HOOK" | "CONTEXT" | "NARRATION" | "EXPLANATION" | "CONCLUSION" | "CTA";
  text: string;
}

export interface ScriptCritique {
  approved: boolean;
  score: number;
  issues: string[];
  improvements: string[];
}

export interface Script {
  id: string;
  momentId: string;
  sourceId: string;
  language: CommentaryLanguage;
  status: ScriptStatus;
  hook: string;
  blocks: CommentaryBlock[];
  title?: string | null;
  critique?: ScriptCritique | null;
  createdAt: string;
  updatedAt: string;
}

export interface RenderJob {
  id: string;
  sourceId: string;
  momentId: string;
  scriptId: string;
  filePath?: string | null;
  durationSec?: number | null;
  resolution?: string | null;
  codec?: string | null;
  fileSizeBytes?: number | null;
  status: RenderStatus;
  createdAt: string;
  updatedAt: string;
}

export interface QaResult {
  id: string;
  renderId: string;
  passed: boolean;
  score: number;
  issues: string[];
  createdAt: string;
}

export interface PublishingJob {
  id: string;
  renderId: string;
  reelId: string;
  platform: string;
  pageId?: string | null;
  scheduledFor?: string | null;
  status: PublishingStatus;
  platformPostId?: string | null;
  error?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface AgentRun {
  id: string;
  agentName: string;
  model: string;
  promptVersion: string;
  inputSummary?: string | null;
  outputSummary?: string | null;
  status: "RUNNING" | "COMPLETED" | "FAILED";
  durationMs?: number | null;
  error?: string | null;
  createdAt: string;
}

export interface JobFailure {
  id: string;
  jobName: string;
  entityId?: string | null;
  error: string;
  attempts: number;
  createdAt: string;
}

export interface SourceEvaluation {
  score: number;
  category: string;
  reason: string;
  recommended: boolean;
}

export interface ReelRecord {
  id: string;
  sourceId: string;
  momentId: string;
  scriptId: string;
  renderId: string;
  title: string;
  caption: string;
  description?: string | null;
  hashtags: string[];
  status: RenderStatus;
  qaScore?: number | null;
  approved: boolean;
  approvedBy?: string | null;
  approvedAt?: string | null;
  publishStatus: PublishingStatus;
  scheduledFor?: string | null;
  publishedPostId?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface DailyStats {
  target: number;
  publishedToday: number;
  ready: number;
  queued: number;
  failed: number;
  remaining: number;
}
