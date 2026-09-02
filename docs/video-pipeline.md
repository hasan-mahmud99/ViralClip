# Video pipeline

- @viralclip/video exposes: ffmpeg/ffprobe wrappers, media probe, SRT/ASS subtitle builders, vertical reel renderer (crop+scale to 1080x1920, burned-in ASS subtitles, audio mixing, optional narration/music), and QA.
- QA checks: container validity, presence of video/audio streams, duration in range, resolution match. Returns a score + issues.
- Real render is exercised by `tests/video/render.test.ts`.

