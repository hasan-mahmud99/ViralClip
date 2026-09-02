# Gemini

- `GeminiProvider` calls the REST `:generateContent` endpoint with `responseMimeType=application/json` for structured output.
- Model + retry policy configured via GEMINI_MODEL / GEMINI_MAX_RETRIES / GEMINI_RETRY_BASE_MS.
- Responses are validated with the zod schemas in `@viralclip/shared` (`SourceEvaluationSchema`, `CandidateMomentSchema`, `CommentaryScriptSchema`, `ScriptCritiqueSchema`, ...).
- `MockLLMProvider` enables deterministic, offline tests.

