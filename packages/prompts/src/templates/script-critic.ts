export function scriptCriticPrompt(input: {
  sourceTitle: string;
  momentTranscript: string;
  script: string;
}): string {
  return `Critique a Bangla commentary script for a short reel. Score hook, clarity, pacing, originality, factual consistency with the source.

Source: ${input.sourceTitle}
Moment transcript:
${input.momentTranscript}

Script:
${input.script}

Return ONLY JSON:
{"approved":true|false,"score":0..10,"issues":[...],"improvements":[...]}.`;
}
