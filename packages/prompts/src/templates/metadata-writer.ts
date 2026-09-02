export function metadataWriterPrompt(input: {
  title: string;
  hook: string;
  scriptSummary: string;
}): string {
  return `Create Facebook Reel metadata (Bangla audience). No misleading claims.

Title: ${input.title}
Hook: ${input.hook}
Summary: ${input.scriptSummary}

Return ONLY JSON:
{"title":"...","caption":"...","description":"...","hashtags":[...],"cta":"..."}.`;
}
