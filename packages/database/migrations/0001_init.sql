CREATE TABLE IF NOT EXISTS source_videos (
  id TEXT PRIMARY KEY,
  youtube_video_id TEXT UNIQUE,
  source_url TEXT NOT NULL,
  channel_id TEXT,
  channel_name TEXT,
  title TEXT NOT NULL,
  description TEXT,
  published_at TIMESTAMPTZ,
  duration_sec DOUBLE PRECISION,
  thumbnail_url TEXT,
  language TEXT,
  discovery_query TEXT,
  discovered_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  rights_status TEXT NOT NULL DEFAULT 'UNKNOWN',
  source_license TEXT,
  permission_url TEXT,
  rights_notes TEXT,
  approved_by_user TEXT,
  approved_at TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'DISCOVERED',
  evaluation_score DOUBLE PRECISION,
  local_file_path TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS transcripts (
  id TEXT PRIMARY KEY,
  source_id TEXT NOT NULL REFERENCES source_videos(id) ON DELETE CASCADE,
  language TEXT NOT NULL,
  text TEXT NOT NULL,
  segments JSONB NOT NULL DEFAULT '[]',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS moments (
  id TEXT PRIMARY KEY,
  source_id TEXT NOT NULL REFERENCES source_videos(id) ON DELETE CASCADE,
  start DOUBLE PRECISION NOT NULL,
  "end" DOUBLE PRECISION NOT NULL,
  score DOUBLE PRECISION NOT NULL,
  category TEXT NOT NULL,
  reason TEXT NOT NULL,
  hook TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'DETECTED',
  clip_fingerprint TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS scripts (
  id TEXT PRIMARY KEY,
  source_id TEXT NOT NULL REFERENCES source_videos(id) ON DELETE CASCADE,
  moment_id TEXT NOT NULL REFERENCES moments(id) ON DELETE CASCADE,
  language TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'GENERATING',
  hook TEXT NOT NULL,
  blocks JSONB NOT NULL DEFAULT '[]',
  title TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS renders (
  id TEXT PRIMARY KEY,
  source_id TEXT NOT NULL REFERENCES source_videos(id) ON DELETE CASCADE,
  moment_id TEXT NOT NULL REFERENCES moments(id) ON DELETE CASCADE,
  script_id TEXT NOT NULL REFERENCES scripts(id) ON DELETE CASCADE,
  file_path TEXT,
  duration_sec DOUBLE PRECISION,
  resolution TEXT,
  status TEXT NOT NULL DEFAULT 'QUEUED',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS qa_results (
  id TEXT PRIMARY KEY,
  render_id TEXT NOT NULL REFERENCES renders(id) ON DELETE CASCADE,
  passed BOOLEAN NOT NULL,
  score DOUBLE PRECISION NOT NULL,
  issues JSONB NOT NULL DEFAULT '[]',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS publishing_jobs (
  id TEXT PRIMARY KEY,
  render_id TEXT NOT NULL REFERENCES renders(id) ON DELETE CASCADE,
  platform TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'QUEUED',
  scheduled_for TIMESTAMPTZ,
  platform_post_id TEXT,
  error TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS agent_runs (
  id TEXT PRIMARY KEY,
  agent_name TEXT NOT NULL,
  model TEXT NOT NULL,
  prompt_version TEXT NOT NULL,
  status TEXT NOT NULL,
  duration_ms DOUBLE PRECISION,
  error TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS settings (
  id TEXT PRIMARY KEY,
  data JSONB NOT NULL DEFAULT '{}',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_source_status ON source_videos(status);
CREATE INDEX IF NOT EXISTS idx_moment_source ON moments(source_id);
CREATE INDEX IF NOT EXISTS idx_script_moment ON scripts(moment_id);
CREATE INDEX IF NOT EXISTS idx_render_script ON renders(script_id);
CREATE INDEX IF NOT EXISTS idx_qa_render ON qa_results(render_id);
