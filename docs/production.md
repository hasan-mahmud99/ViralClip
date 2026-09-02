# Production notes (AWS EC2 + Docker)

- Use `docker compose up -d --build` with a real `.env`.
- Postgres/Redis volumes persist across restarts (`pgdata`, `redisdata`).
- Media lives on a shared named volume `media`.
- Tune concurrency env vars for the instance size (defaults are EC2-small friendly).
- Backup: pg_dump of `viralclip` DB; rsync the `media` volume.
- Keep secrets only in `.env` (never in the repo).

