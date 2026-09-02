# ViralClip — Setup

## Local (this repo, no Docker)

Requires Node 22+ and FFmpeg on PATH (for render/QA tests).

```bash
npm install
npm run build      # typecheck/compile every package via tsc
npm run test:unit  # fast unit tests
npm run test:video # real FFmpeg render + QA (media/renders/reel.mp4)
npm run test:e2e   # full mock pipeline -> media/e2e/final_test_reel.mp4
npm run api        # dev server on :4000 (tsx)
npm run worker     # worker entry (tsx)
```

## Docker / AWS Ubuntu (production)

```bash
cp .env.example .env   # set keys + admin password
docker compose up -d --build
docker compose logs -f api worker
```

Apply the schema once Postgres is healthy:

```bash
docker compose exec -T postgres psql -U viralclip -d viralclip \
  < packages/database/migrations/0001_init.sql
```

## Environment

All config is read from the environment (see `.env.example` and
[docs/environment.md](environment.md)). Never commit real secrets.

> Note: `MOCK_MODE` / absent API keys keep the system runnable in mock mode. When you
> provide `GEMINI_API_KEY`, `YOUTUBE_API_KEY`, `META_ACCESS_TOKEN`/`META_PAGE_ID`, the real
> providers are used by their factory functions.
