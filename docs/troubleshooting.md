# Troubleshooting

- `ffmpeg not found` — install FFmpeg and ensure on PATH (renders/QA need it).
- Auth 401 — set `ADMIN_PASSWORD` to the same value used by the dashboard/API client.
- Gemini errors — check key/quota; retries are bounded by `GEMINI_MAX_RETRIES`.
- Mock mode surprises — confirm `MOCK_MODE=true` and no secrets present.
- Rebuild after edits: `npm run build`.

