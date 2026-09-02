-- Pipeline state / reel records
CREATE TABLE IF NOT EXISTS reels (
  id TEXT PRIMARY KEY,
  source_id TEXT NOT NULL REFERENCES source_videos(id) ON DELETE CASCADE,
  source_creator TEXT,
  moment_id TEXT REFERENCES moments(id),
  script_id TEXT REFERENCES scripts(id),
  render_id TEXT REFERENCES renders(id),
  title TEXT,
  caption TEXT,
  hashtags JSONB DEFAULT '[]',
  state TEXT NOT NULL DEFAULT 'DISCOVERED',
  qa_score DOUBLE PRECISION,
  scheduled_for TIMESTAMPTZ,
  published_at TIMESTAMPTZ,
  platform TEXT,
  platform_post_id TEXT,
  error_code TEXT,
  error_message TEXT,
  failed_stage TEXT,
  retry_count INTEGER NOT NULL DEFAULT 0,
  last_attempt_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Job executions (BullMQ mirror for durable tracing/restart recovery)
CREATE TABLE IF NOT EXISTS job_runs (
  id TEXT PRIMARY KEY,
  job_name TEXT NOT NULL,
  entity_id TEXT,
  state TEXT NOT NULL DEFAULT 'queued',
  error_code TEXT,
  error_message TEXT,
  failed_stage TEXT,
  retry_count INTEGER NOT NULL DEFAULT 0,
  last_attempt_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Publishing jobs
CREATE TABLE IF NOT EXISTS publish_jobs (
  id TEXT PRIMARY KEY,
  reel_id TEXT NOT NULL REFERENCES reels(id) ON DELETE CASCADE,
  platform TEXT NOT NULL,
  page_id TEXT,
  state TEXT NOT NULL DEFAULT 'queued',
  scheduled_for TIMESTAMPTZ,
  platform_post_id TEXT,
  error_code TEXT,
  error_message TEXT,
  retry_count INTEGER NOT NULL DEFAULT 0,
  last_attempt_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Analytics foundation
CREATE TABLE IF NOT EXISTS analytics_snapshots (
  id TEXT PRIMARY KEY,
  reel_id TEXT NOT NULL REFERENCES reels(id) ON DELETE CASCADE,
  platform TEXT,
  published_at TIMESTAMPTZ,
  source_id TEXT,
  source_creator TEXT,
  topic TEXT,
  moment_score DOUBLE PRECISION,
  qa_score DOUBLE PRECISION,
  views BIGINT,
  likes BIGINT,
  comments BIGINT,
  shares BIGINT,
  watch_time_sec DOUBLE PRECISION,
  retention_pct DOUBLE PRECISION,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- source_videos additions (idempotent via DO block for PG)
DO $$
BEGIN
  BEGIN ALTER TABLE source_videos ADD COLUMN source_platform TEXT; EXCEPTION WHEN duplicate_column THEN NULL; END;
  BEGIN ALTER TABLE source_videos ADD COLUMN source_video_id TEXT; EXCEPTION WHEN duplicate_column THEN NULL; END;
  BEGIN ALTER TABLE source_videos ADD COLUMN creator_name TEXT; EXCEPTION WHEN duplicate_column THEN NULL; END;
  BEGIN ALTER TABLE source_videos ADD COLUMN source_license TEXT; EXCEPTION WHEN duplicate_column THEN NULL; END;
  BEGIN ALTER TABLE source_videos ADD COLUMN permission_url TEXT; EXCEPTION WHEN duplicate_column THEN NULL; END;
  BEGIN ALTER TABLE source_videos ADD COLUMN rights_notes TEXT; EXCEPTION WHEN duplicate_column THEN NULL; END;
  BEGIN ALTER TABLE source_videos ADD COLUMN approved_by_user TEXT; EXCEPTION WHEN duplicate_column THEN NULL; END;
  BEGIN ALTER TABLE source_videos ADD COLUMN approved_at TIMESTAMPTZ; EXCEPTION WHEN duplicate_column THEN NULL; END;
  BEGIN ALTER TABLE source_videos ADD COLUMN evaluation_score DOUBLE PRECISION; EXCEPTION WHEN duplicate_column THEN NULL; END;
  BEGIN ALTER TABLE source_videos ADD COLUMN source_hash TEXT; EXCEPTION WHEN duplicate_column THEN NULL; END;
END $$;

CREATE INDEX IF NOT EXISTS idx_reels_state ON reels(state);
CREATE INDEX IF NOT EXISTS idx_reels_source ON reels(source_id);
CREATE INDEX IF NOT EXISTS idx_job_runs_name_state ON job_runs(job_name, state);
CREATE INDEX IF NOT EXISTS idx_publish_state ON publish_jobs(state);
CREATE INDEX IF NOT EXISTS idx_source_video_id ON source_videos(youtube_video_id);
