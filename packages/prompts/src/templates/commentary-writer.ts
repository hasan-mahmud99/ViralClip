export function commentaryWriterPrompt(input: {
  language: string;
  title: string;
  momentTranscript: string;
  hook: string;
  angle?: string;
}): string {
  return `Write an ORIGINAL Bangla narration script (${input.language}) around a source moment for a short-form reel. Do NOT quote or repeat the source verbatim; give context, reaction, explanation, and payoff. Do not invent facts.

Source title: ${input.title}
Hook: ${input.hook}
Commentary angle: ${input.angle ?? "general reaction"}
Moment transcript:
${input.momentTranscript}

Return ONLY JSON:
{"language":"bn","title":"...","hook":"...","blocks":[{"start":..,"end":..,"kind":"HOOK|CONTEXT|NARRATION|EXPLANATION|CONCLUSION|CTA","text":"..."}]}.`;
}
