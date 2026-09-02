/** Core enums used across the system. */

export type SourceRightsStatus =
  | "UNKNOWN"
  | "LICENSED"
  | "PERMISSION_GRANTED"
  | "CREATOR_PROVIDED"
  | "PUBLIC_DOMAIN"
  | "CREATIVE_COMMONS"
  | "PLATFORM_PERMITTED"
  | "USER_APPROVED"
  | "BLOCKED";

export type SourceProcessingStatus =
  | "DISCOVERED"
  | "EVALUATING"
  | "RIGHTS_PENDING"
  | "RIGHTS_APPROVED"
  | "INGESTING"
  | "INGESTED"
  | "APPROVED"
  | "BLOCKED"
  | "TRANSCRIBING"
  | "TRANSCRIBED"
  | "ANALYZING"
  | "PROCESSED"
  | "FAILED";

export type PipelineStage =
  | "DISCOVERED"
  | "SOURCE_APPROVED"
  | "INGESTED"
  | "TRANSCRIBED"
  | "MOMENT_SELECTED"
  | "SCRIPT_GENERATED"
  | "SCRIPT_APPROVED"
  | "TTS_COMPLETE"
  | "RENDERED"
  | "QA_PASSED"
  | "READY"
  | "SCHEDULED"
  | "UPLOADING"
  | "PUBLISHED"
  | "FAILED";

export type JobName =
  | "source-discovery"
  | "source-analysis"
  | "transcription"
  | "moment-analysis"
  | "script-generation"
  | "script-critique"
  | "tts"
  | "render"
  | "qa"
  | "publishing"
  | "analytics"
  | "daily-orchestration";

export type MomentStatus = "DETECTED" | "SCORED" | "SELECTED" | "REJECTED";
export type ScriptStatus = "GENERATING" | "GENERATED" | "CRITIQUING" | "APPROVED" | "REJECTED";
export type RenderStatus = "QUEUED" | "RENDERING" | "RENDERED" | "QA_PENDING" | "QA_PASSED" | "QA_FAILED" | "FAILED";
export type PublishingStatus = "QUEUED" | "SCHEDULED" | "UPLOADING" | "PUBLISHED" | "FAILED" | "CANCELLED";

export type RightsPolicy = "manual" | "approved_only" | "licensed_only" | "trusted_sources";
export type ApprovalMode = "manual" | "automatic" | "hybrid";
export type CommentaryLanguage = "bn" | "en" | "mixed";

export type IngestionKind = "LOCAL_FILE" | "CREATOR_PROVIDED_FILE" | "AUTHORIZED_SOURCE";

export type JobExecutionStatus = "queued" | "active" | "completed" | "failed" | "retrying";
