#!/usr/bin/env python3
"""ViralClip faster-whisper transcription bridge.

Usage:
    python transcribe.py --media <file.mp4> [--model small] [--language auto] [--json]
Prints JSON on stdout:
    {"language": "...", "segments": [{"start": .., "end": .., "text": "..."}]}
"""

import argparse
import json
import sys


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--media", required=True)
    parser.add_argument("--model", default="small")
    parser.add_argument("--language", default="auto")
    parser.add_argument("--json", action="store_true")
    args = parser.parse_args()

    try:
        from faster_whisper import WhisperModel
    except ImportError as exc:  # pragma: no cover
        print(json.dumps({"error": f"faster-whisper not installed: {exc}"}), file=sys.stderr)
        return 2

    model = WhisperModel(args.model, device="cpu", compute_type="int8")
    language = None if args.language in ("auto", "") else args.language
    segments_iter, info = model.transcribe(args.media, language=language, vad_filter=True)

    segments = []
    for segment in segments_iter:
        segments.append(
            {
                "start": round(segment.start, 3),
                "end": round(segment.end, 3),
                "text": segment.text.strip(),
            }
        )

    out = {"language": info.language, "segments": segments}
    if args.json:
        json.dump(out, sys.stdout, ensure_ascii=False)
        print()
    else:
        for s in segments:
            print(f"[{s['start']:7.2f} -> {s['end']:7.2f}] {s['text']}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
