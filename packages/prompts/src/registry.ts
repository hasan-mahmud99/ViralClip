export const PROMPT_VERSIONS = {
  "source-evaluator": "source-evaluator-v1",
  "moment-finder": "moment-finder-v1",
  "commentary-writer": "commentary-writer-v1",
  "script-critic": "script-critic-v1",
  "metadata-writer": "metadata-writer-v1",
  "dynamic-queries": "dynamic-queries-v1",
} as const;

export type PromptName = keyof typeof PROMPT_VERSIONS;
