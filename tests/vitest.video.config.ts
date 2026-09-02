import { defineConfig } from "vitest/config";
import { join } from "node:path";

export default defineConfig({
  resolve: {
    alias: {
      "@viralclip/shared": join(__dirname, "../packages/shared/src/index.ts"),
      "@viralclip/video": join(__dirname, "../packages/video/src/index.ts"),
    },
  },
  test: { environment: "node", include: ["tests/video/**/*.test.ts"], testTimeout: 180_000, hookTimeout: 180_000 },
});
