# ViralClip — Architecture

## Services

- `apps/api` — REST API (Express). Configuration-driven; uses `@viralclip/database` store.
- `apps/worker` — headless worker entrypoint; hosts the pipeline (`ReelPipeline`), job processors and the mock E2E path.
- `apps/dashboard` — Vite/React admin dashboard (scaffold).

## Packages

- `@viralclip/shared` — env parsing (zod), settings, domain types/enums, AI-output zod schemas, logger, errors, utilities.
- `@viralclip/prompts` — versioned prompt builders (`prompt_version` registry) for each agent.
- `@viralclip/providers` — provider interfaces + implementations:
  - LLM: `LLMProvider` (Gemini REST + MockLLM with structured JSON)
  - Transcription: `faster-whisper` adapter + mock transcript provider
  - TTS: `espeak-ng` local + mock (writes real WAV assets)
  - Discovery: YouTube Data API client + mock
  - Publisher: Facebook Graph API + mock
- `@viralclip/video` — FFmpeg wrapper, probe, ASS/SRT subtitles, vertical reel renderer, QA (ffprobe-based).
- `@viralclip/database` — typed store interface + in-memory store; `migrations/0001_init.sql` for PostgreSQL.

## Pipeline

`ReelPipeline.run(source, outPath)`:

1. evaluate source (LLM / mock)
2. transcribe (mock or faster-whisper)
3. find best moment from timestamped transcript
4. write original commentary script (Bangla)
5. critique script, approve/reject
6. TTS narration → real audio asset
7. FFmpeg render 1080x1920 reel (subtitles burned, audio mixed)
8. automated QA via ffprobe (duration/resolution/audio checks) → QA report

External gates (rights policy, approval mode, Facebook scheduling) are deliberately part of
the surrounding worker/orchestrator layer and are enforced by configuration:
`SOURCE_RIGHTS_POLICY`, `APPROVAL_MODE`, `META_PAGE_ID`/`META_ACCESS_TOKEN`.

## Tests

- `tests/unit` — pure logic (env/settings/subtitle text).
- `tests/video` — REAL FFmpeg render + QA assertion (produces `media/renders/reel.mp4`).
- `tests/e2e` — full mock pipeline producing `media/e2e/final_test_reel.mp4`.
