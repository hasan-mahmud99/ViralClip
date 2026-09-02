export function dynamicQueriesPrompt(base: string): string {
  return `Generate up to 10 distinct YouTube search queries likely to find interesting creator/internet moments for short-form content. Return ONLY JSON: {"queries":[...]}. Base interest: ${base}`;
}
