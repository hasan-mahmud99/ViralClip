# ViralClip — README

Automated short-form video clipping for the **Golpo Box** Facebook page.
Generates original commentary-based Reels from rights-permitted sources, then
schedules/publishes to Facebook via the official Graph API.

> **Rights-first.** Sources whose rights status is `UNKNOWN` never auto-publish.
> Publishing is gated by `APPROVAL_MODE` + `SOURCE_RIGHTS_POLICY` + `DRY_RUN`.

## Repository layout

```
apps/api          REST API (Express): settings, sources, reels, jobs, health, run-once trigger
apps/worker       automation engine: discovery processor, pipeline runner, publish gate, daemon
apps/dashboard    React/Vite dashboard (scaffold)
packages/shared   env/config, domain enums/types, zod schemas, logger, errors, utils
packages/prompts  versioned prompt builders
packages/providers LLM (Gemini + mock), transcription, TTS, discovery (YouTube), publisher (Facebook)
packages/video    FFmpeg renderer, probe, SRT/ASS subtitles, QA
packages/database store interface + in-memory store; Postgres migrations
infra             Dockerfiles, nginx, scripts, faster-whisper bridge
tests             vitest suites: unit / video (real FFmpeg) / e2e (automation dry-run + real MP4)
```

## Quick start (local, no Docker)

```bash
npm install
npm run build          # typecheck + compile all packages
npm run test:unit      # unit tests (rights, discovery dedupe, env, settings, subtitles)
npm run test:video     # REAL FFmpeg render + QA -> media/renders/reel.mp4
npm run test:e2e       # automation dry-run (WOULD_PUBLISH) + mock full pipeline -> final_test_reel.mp4
npm run api            # API on :4000
npm run worker         # worker daemon (DRY_RUN=true by default)
```

## Environment (see `.env.example`)

```ini
DRY_RUN=true
DAILY_REEL_TARGET=3
PUBLISH_TIMES=09:00,14:00,20:00
TIMEZONE=Asia/Dhaka
APPROVAL_MODE=manual
SOURCE_RIGHTS_POLICY=approved_only
GEMINI_API_KEY=
GEMINI_MODEL=gemini-2.5-flash
YOUTUBE_API_KEY=
META_ACCESS_TOKEN=
META_PAGE_ID=
DATABASE_URL=postgresql://viralclip:viralclip@postgres:5432/viralclip
REDIS_URL=redis://redis:6379
ADMIN_PASSWORD=change-me
```

`DRY_RUN=true` is the default and is the recommended safe operating mode:
discovery, processing and rendering run normally, but publishing is never performed
— the gate returns `WOULD_PUBLISH` and logs it.

## How the automation works (implemented + tested)

The worker daemon runs a cycle on an interval:

1. `source-discovery` — queries configured search terms via the YouTube provider
   (or mock), stores candidates, dedupes by `youtubeVideoId`, applies the rights policy.
   Discovered sources default to `RIGHTS_PENDING` under `approved_only` — they are never
   auto-ingested/downloaded.
2. A local/authorized source (e.g. via the API or `SOURCE_MEDIA`) that is `USER_APPROVED`
   and has a local file proceeds through the pipeline: transcribe → moments → commentary →
   critic → TTS → FFmpeg render (1080x1920) → QA → `READY`.
3. `publish gate` — only publishes when all of these hold: reel exists, QA passed,
   approval mode permits, source is not blocked, publisher credentials exist, and
   `DRY_RUN=false`. Otherwise it returns `WOULD_PUBLISH` or `SKIPPED` and never publishes.

## Tests

- `tests/unit/rights.test.ts` — rights policy (manual/approved_only/licensed_only/trusted_sources)
- `tests/unit/discovery.test.ts` — discovery inserts + dedupe; never sets a download path
- `tests/video/render.test.ts` — real FFmpeg vertical render + QA
- `tests/e2e/automation.test.ts` — full worker cycle under `DRY_RUN=true` → `WOULD_PUBLISH`, never `PUBLISHED`
- `tests/e2e/pipeline.test.ts` — mock full pipeline → real `final_test_reel.mp4`

## Docs

See `docs/` — architecture, setup, youtube, gemini, facebook, video-pipeline,
troubleshooting, production, and `docs/aws-ec2-walkthrough.md` + `docs/LOCAL-TESTING.md`.
