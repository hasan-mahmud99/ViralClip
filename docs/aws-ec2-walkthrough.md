# Deploying ViralClip on AWS EC2 — Full Walkthrough

> Honest status first: today the deployable, verified stack is **API + Postgres + Redis +
> Dashboard**, plus a **CLI reel generator** (`npm run run:local`). The **automated daily
> worker/orchestrator (BullMQ queues → publish)** is scaffolded but not yet wired; use the CLI
> to generate reels now, and wire the worker to the DB/Redis next.

## 1. Create the EC2 instance

AWS Console → EC2 → Launch instance:

- Name: `viralclip-prod`
- AMI: **Ubuntu 24.04 LTS** (HVM, x86_64)
- Instance type: **t3.medium** minimum (2 vCPU / 4 GB RAM). For 20 reels/day with whisper + renders: **t3.large**.
- Key pair: create/download `viralclip.pem`
- Network settings:
  - Allow SSH (22) from your IP
  - Allow HTTP (80) and HTTPS (443) from anywhere (0.0.0.0/0)
  - (Optional) allow 4000 only from your IP for direct API testing
- **Configure storage: 40 GB gp3** (whisper models + renders + Postgres)
- Launch, then **note the Public IPv4 / DNS** (e.g. `13.xx.xx.xx`)

## 2. First SSH + baseline setup

```bash
chmod 400 viralclip.pem
ssh -i viralclip.pem ubuntu@13.xx.xx.xx
```

```bash
sudo apt update && sudo apt upgrade -y
sudo apt install -y git curl ca-certificates gnupg ffmpeg
```

## 3. Install Docker + Compose

```bash
# Docker Engine (official convenience script)
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# Add your user to docker group (log out/in after)
sudo usermod -aG docker $USER
# re-connect:  ssh -i viralclip.pem ubuntu@...   (so group applies)

docker --version && docker compose version
```

## 4. Get the code onto the server

Option A — from Git (recommended):

```bash
cd ~
git clone <your-viralclip-repo-url> viralclip
cd viralclip
```

Option B — from this Windows machine (no git remote yet):

```powershell
# on Windows, in D:\viral clip
# create an archive excluding build artifacts/media:
#   (7zip example; adjust to your tool)
7z a ..\viralclip.zip . -xr!node_modules -xr!dist -xr!media -xr!.git -xr!coverage

# upload
scp -i C:\path\to\viralclip.pem ..\viralclip.zip ubuntu@13.xx.xx.xx:~
```

```bash
# on server
cd ~ && sudo apt install -y unzip
unzip viralclip.zip -d viralclip && cd viralclip
```

## 5. Configure environment

```bash
cd ~/viralclip
cp .env.example .env
nano .env
```

Set at minimum:

```ini
NODE_ENV=production
MOCK_MODE=false

GEMINI_API_KEY=your_gemini_key
GEMINI_MODEL=gemini-2.5-flash

YOUTUBE_API_KEY=your_youtube_key

META_ACCESS_TOKEN=your_page_token
META_PAGE_ID=your_page_id

DATABASE_URL=postgresql://viralclip:CHANGE_ME_STRONG@postgres:5432/viralclip?schema=public
REDIS_URL=redis://redis:6379

POSTGRES_USER=viralclip
POSTGRES_PASSWORD=CHANGE_ME_STRONG

ADMIN_PASSWORD=CHANGE_ME_ADMIN

TIMEZONE=Asia/Dhaka
DAILY_REEL_TARGET=3
PUBLISH_TIMES=09:00,14:00,20:00
APPROVAL_MODE=manual          # keep manual until you trust it
SOURCE_RIGHTS_POLICY=approved_only
COMMENTARY_LANGUAGE=bn
TTS_PROVIDER=mock              # espeak is installed in image; switch when you want robotic local voice
WHISPER_SCRIPT=/app/infra/python/transcribe.py
```

> `DATABASE_URL` host is the compose service name **`postgres`** (inside the compose network),
> not `localhost`.

## 6. Build & start

```bash
docker compose up -d --build
docker compose ps
```

Wait for `postgres`/`redis` to be `healthy`, then apply the schema once:

```bash
docker compose exec -T postgres psql -U viralclip -d viralclip \
  < packages/database/migrations/0001_init.sql
```

## 7. Verify

```bash
# API
curl http://localhost:4000/healthz
# -> {"ok":true,...}

# Dashboard
curl -I http://localhost:5173
# HTTP/1.1 200

# logs
docker compose logs -f api
```

## 8. Generate your first reel on the server

The worker image contains FFmpeg + Python + espeak. Upload a source video and run the CLI inside the worker container:

```powershell
# Windows:
scp -i C:\path\viralclip.pem D:\viral\myvideo.mp4 ubuntu@13.xx.xx.xx:~/source.mp4
```

```bash
# server: copy into the media volume via the worker container
docker compose cp ~/source.mp4 worker:/app/media/sources/source.mp4

docker compose exec worker sh -lc "cd /app && \
  SOURCE_MEDIA=media/sources/source.mp4 \
  TRANSCRIPTION_PROVIDER=mock \
  npx tsx apps/worker/src/local-run-cli.ts media/sources/source.mp4"
```

The rendered reel appears at `media/renders/reel-<ts>.mp4` inside the worker. Pull it out to inspect:

```bash
docker compose cp worker:/app/media/renders/reel-xxx.mp4 ~/reel.mp4
# or view inside container logs path shown in output
```

## 9. Open it up (DNS + HTTPS)

- EIP: attach an **Elastic IP** so the address never changes.
- Route 53: point `reels.yourdomain.com` → that IP.
- Option A (simple): install Caddy to auto-TLS and proxy:

```bash
sudo apt install -y caddy
sudo tee /etc/caddy/Caddyfile >/dev/null <<'EOF'
reels.yourdomain.com {
    reverse_proxy localhost:5173        # dashboard
}
api.reels.yourdomain.com {
    reverse_proxy localhost:4000        # api
}
EOF
sudo systemctl enable --now caddy
```

- Option B: leave nginx container + set HTTP only while testing.

## 10. Security group recap

| Port | Source | Purpose |
|---|---|---|
| 22 | your IP | SSH |
| 80/443 | 0.0.0.0/0 | dashboard + API via Caddy |
| 5432/6379 | — | **Do NOT open publicly** (compose internal only) |

Also: **never commit `.env`**, rotate the DB/admin passwords, and set `APPROVAL_MODE=manual`
until you've reviewed a few real reels.

## 11. Cost / sizing notes

- `t3.medium` ≈ $0.0416/hr on-demand (~$30/mo) — fine for 3–5 reels/day manual.
- `t3.large` ≈ $0.0832/hr (~$60/mo) — needed for whisper transcription + concurrent renders at 20/day.
- EBS 40GB gp3 ≈ $4–8/mo. Use the free tier (`t2.micro`/`t3.micro`) only for a smoke test — it cannot run whisper/renders well.

## 12. Where the remaining work is

1. **Worker automation**: the `worker` container currently boots a scaffold. To get scheduled
   daily generation → publish, wire job processors (BullMQ) against `DATABASE_URL`/`REDIS_URL`
   using the store interface + `packages/database/migrations`.
2. **Dashboard**: currently a placeholder page. Real screens (sources, reels, approvals,
   settings) come next.
3. **faster-whisper**: enable by installing the model inside the worker image and pointing
   `WHISPER_PYTHON`/`WHISPER_SCRIPT` at it (the image already has python3; add
   `pip install faster-whisper`).
