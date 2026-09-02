-- Unique constraints required by ON CONFLICT upserts used by the Postgres store.
CREATE UNIQUE INDEX IF NOT EXISTS transcripts_source_id_key ON transcripts(source_id);
CREATE UNIQUE INDEX IF NOT EXISTS qa_results_render_id_key ON qa_results(render_id);
