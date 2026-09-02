export function sourceEvaluatorPrompt(input: {
  title: string;
  channel: string;
  description?: string;
  durationSec?: number;
}): string {
  return `You evaluate whether a YouTube video is suitable as a source for an original short-form reel with Bangla commentary.

Title: ${input.title}
Channel: ${input.channel}
Description: ${input.description ?? "n/a"}
Duration(sec): ${input.durationSec ?? "unknown"}

Return ONLY JSON: {"score":0..10,"category":"...","reason":"...","recommended":true|false}.`;
}
