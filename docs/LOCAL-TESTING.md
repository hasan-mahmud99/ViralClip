# Local Full-Stack Testing — Hybrid Setup (Windows, everything on D:)

Goal: run **PostgreSQL + Redis in Docker** (lightweight) and **faster-whisper natively via Python**,
so the real pipeline (transcription → Gemini → TTS → FFmpeg → QA → publish stub) can be exercised locally.

## 0. Disk check (important)

D: currently has ~14 GB free. Recommended ≥ 25 GB before starting:

- WSL2 distro + Docker data → a few GB on D:
- PostgreSQL/Redis images → ~0.5 GB
- faster-whisper model (`small` ≈ 460 MB, cache on D:)
- Renders/media → grows with use

## 1. Install Docker Desktop on D:

Docker Desktop needs **WSL2**. From an **admin** PowerShell:

```powershell
# 1) Enable + install WSL2 with Ubuntu, then reboot when prompted
wsl --install -d Ubuntu
#    (Restart Windows, then finish Ubuntu user setup)

# 2) After reboot, force WSL distro storage onto D:
wsl --shutdown
wsl --export Ubuntu D:\wsl\ubuntu.tar
wsl --unregister Ubuntu
wsl --import Ubuntu D:\wsl\ubuntu D:\wsl\ubuntu.tar --version 2

# 3) Install Docker Desktop (winget):  then sign out/in once
winget install --id Docker.DockerDesktop -e
```

Inside Docker Desktop **Settings → Resources → Advanced**:

- “Disk image location” → `D:\docker`
- Memory: leave default or set ≥ 4 GB.

## 2. Start only Postgres + Redis (hybrid)

```powershell
cd "D:\viral clip"
Copy-Item .env.example .env          # edit .env: keys, ADMIN_PASSWORD

# Create local override so api/worker/dashboard containers are NOT started here
# (we run worker/api natively so whisper can reach them easily):
docker compose up -d postgres redis
docker compose ps
```

Apply schema once:

```powershell
docker compose exec -T postgres psql -U viralclip -d viralclip -f - < packages/database/migrations/0001_init.sql
```

## 3. faster-whisper natively (Python on D:)

From an **admin** PowerShell:

```powershell
# Install Python 3.11+ to D:\d-tools\Python (python.org installer, custom path)

# Create venv on D:
& "D:\d-tools\Python\python.exe" -m venv D:\d-tools\whisper-venv

# Install faster-whisper into the venv
D:\d-tools\whisper-venv\Scripts\python.exe -m pip install --upgrade pip
D:\d-tools\whisper-venv\Scripts\python.exe -m pip install faster-whisper

# Cache model on D:
$env:HF_HOME = "D:\d-tools\hf-cache"
```

Then append to `D:\viral clip\.env`:

```
TRANSCRIPTION_PROVIDER=whisper
WHISPER_PYTHON=D:/d-tools/whisper-venv/Scripts/python.exe
WHISPER_SCRIPT=infra/python/transcribe.py
WHISPER_MODEL=small
```

Verify the bridge:

```powershell
D:\d-tools\whisper-venv\Scripts\python.exe infra/python/transcribe.py --media media\sources\sample-source.mp4 --model tiny --json
```

(`tiny` ≈ 75 MB for a quick smoke test; switch back to `small` for quality.)

## 4. Run the real pipeline natively (API + worker via tsx)

```powershell
# Build everything
npm install
npm run build

# Optional: create a sample source video (real speech only if you provide your own mp4)
npm run media:sample

# Generate one Reel from a local video through the REAL stack:
# mock LLM  + whisper transcription + mock TTS + real FFmpeg + real QA
npm run run:local -- media\sources\sample-source.mp4
# output -> media/renders/reel-<ts>.mp4

# With a real Gemini key in .env:
$env:LLM_PROVIDER="gemini"
npm run run:local -- media\sources\my-video.mp4
```

Native API server (talks to Postgres-backed store once the store is wired):

```powershell
npm run api          # http://127.0.0.1:4000/healthz
```

## 5. Full-suite verification

```powershell
npm run test:unit    # fast, no services
npm run test:video   # real FFmpeg render + QA
npm run test:e2e     # mock pipeline -> final_test_reel.mp4
```

## 6. When you want the full Docker stack instead (whisper in container)

```powershell
docker compose up -d --build
docker compose logs -f api worker
```

Notes
- Real Facebook publishing additionally needs `META_ACCESS_TOKEN` + `META_PAGE_ID` and
  `APPROVAL_MODE` (manual by default). Start manual, approve in the dashboard, publish manually.
- YouTube discovery needs `YOUTUBE_API_KEY`.
- Nothing is published automatically unless credentials exist AND the rights/approval policy allows it.
