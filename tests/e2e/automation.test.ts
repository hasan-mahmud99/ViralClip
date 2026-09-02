import { describe, it, expect, beforeAll } from "vitest";
import { join } from "node:path";
import { mkdirSync, existsSync } from "node:fs";
import { runWorkerOnce } from "../../apps/worker/src/index";
import { sampleClip } from "@viralclip/video";

const SRC = join(__dirname, "../../media/sources/auto-sample.mp4");

describe("automation: dry-run worker cycle (discovery -> process -> QA -> publish gate)", () => {
  beforeAll(async () => {
    mkdirSync(join(__dirname, "../../media/renders"), { recursive: true });
    if (!existsSync(SRC)) {
      await sampleClip({ outputPath: SRC, durationSec: 8, width: 1920, height: 1080 });
    }
  }, 120_000);

  it("returns WOULD_PUBLISH and never publishes under DRY_RUN", async () => {
    const res = await runWorkerOnce({
      env: {
        SOURCE_MEDIA: SRC,
        DRY_RUN: "true",
        MOCK_MODE: "true",
        META_ACCESS_TOKEN: "",
        META_PAGE_ID: "",
        GEMINI_API_KEY: "",
        STORAGE_BASE_PATH: join(__dirname, "../../media"),
      },
    });
    expect(res.publish.length).toBeGreaterThanOrEqual(1);
    const publish = res.publish[0];
    expect(["WOULD_PUBLISH", "SKIPPED"]).toContain(publish.action);
    expect(publish.action).not.toBe("PUBLISHED");
  }, 300_000);
});
