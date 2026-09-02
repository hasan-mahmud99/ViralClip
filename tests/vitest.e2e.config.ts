import { defineConfig } from "vitest/config";
import { join } from "node:path";

export default defineConfig({
  resolve: {
    alias: {
      "@viralclip/shared": join(__dirname, "../packages/shared/src/index.ts"),
      "@viralclip/providers": join(__dirname, "../packages/providers/src/index.ts"),
      "@viralclip/video": join(__dirname, "../packages/video/src/index.ts"),
      "@viralclip/database": join(__dirname, "../packages/database/src/index.ts"),
      "@viralclip/prompts": join(__dirname, "../packages/prompts/src/index.ts"),
      "@viralclip/worker": join(__dirname, "../apps/worker/src/pipeline.ts"),
    },
  },
  test: { environment: "node", include: ["tests/e2e/**/*.test.ts"], testTimeout: 300_000, hookTimeout: 300_000 },
});
