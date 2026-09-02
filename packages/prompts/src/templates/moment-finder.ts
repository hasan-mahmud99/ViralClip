export function momentFinderPrompt(input: {
  title: string;
  language: string;
  transcript: string;
  minSeconds: number;
  maxSeconds: number;
}): string {
  return `You find the most interesting self-contained moments in a video transcript for a short vertical clip (Bangla commentary will be added later).

Video: ${input.title}
Language: ${input.language}
Clip length limits: ${input.minSeconds}-${input.maxSeconds}s

Transcript with timestamps:
${input.transcript}

Return ONLY JSON: {"moments":[{"start":..,"end":..,"score":0..10,"category":"...","reason":"...","hook":"..."}]}.`;
}
