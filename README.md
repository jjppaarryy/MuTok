# MuTok TikTok Autoposter (Single-User MVP)

Local-first web app that plans, renders, and uploads TikTok drafts for music-first hooks.
You run it on your Mac; you only open TikTok on phone to post.

## Quick Start

### Prereqs
- macOS
- Node 22.12+ (Prisma 7 requires 20.19+ or 22.12+)
- FFmpeg installed and available in PATH

### Setup
```
# If Node 22 is not on PATH yet (Homebrew)
export PATH="/opt/homebrew/opt/node@22/bin:$PATH"

npm install
npx prisma generate
npx prisma migrate dev
npm run dev
```

Open: `http://localhost:3000`

### Env vars
Copy `.env.example` to `.env.local` and fill:
- `TIKTOK_CLIENT_ID`
- `TIKTOK_CLIENT_SECRET`
- `TIKTOK_REDIRECT_URI`
- `OPENAI_API_KEY`
- optional `OPENAI_MODEL`

## Core Workflow

1) **Asset Bank**
- Upload clips (mp4/mov) and tracks (wav/mp3).
- Tag clips: category, energy, motion, sync, vibe.
- Generate snippets and approve candidates.

2) **Rules & Templates**
- Set cadence, queue size, montage settings.
- Configure caption markers and keywords.
- Edit Hook Recipes (beat1/beat2 templates + CTA + constraints).
- Start/stop scheduler.

3) **Viral Engine**
- Enforce two-beat text, moment windows, CTA requirements.
- Adjust explore ratio.

4) **Queue**
- Top up plans, render pending, upload drafts.
- Preview renders and see warnings.

5) **Analytics & Learning**
- Refresh metrics (daily).
- Hook and container leaderboards.
- Manual “mark as posted” mapping.

## Key Buttons (What they do)

- **Top up drafts**: generates planned posts (respecting rules + viral engine).
- **Render pending**: renders planned posts to MP4 using FFmpeg.
- **Upload drafts**: uploads rendered posts as TikTok drafts.
- **Run brain now**: LLM generates new plans (JSON schema enforced).
- **System Status → Create + render 2 test plans**: e2e smoke test.

## TikTok Flow Notes

- OAuth is required; Connect page manages tokens and status.
- Creator info is queried before upload.
- Export UI defaults are stored and used for upload payloads.
- Spam risk errors trigger a 24h upload cooldown.
- Pending share cap (5/24h) is enforced.

## Files / Storage

- Local assets in `data/`:
  - `data/clips`
  - `data/tracks`
  - `data/renders`
- SQLite DB at `prisma/dev.db`

## System Status

Use the **System Status** tab to check:
- Env vars
- FFmpeg availability
- DB connectivity
- TikTok OAuth + cooldown
- Scheduler status

## Common Tasks

### Add clips
Asset Bank → Upload clip → tag → save.

### Approve snippets
Asset Bank → Upload track → Generate snippets → Approve.

### Generate + render
Queue → Top up → Render pending.

### Upload drafts
Queue → Upload drafts (requires TikTok OAuth).

## Notes
- `.env.local` should not be committed.
- Versions are pinned in `apps/web/package.json` for stability.
