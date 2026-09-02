import { describe, it, expect } from "vitest";
import { settingsFromEnv, DEFAULT_SETTINGS } from "@viralclip/shared";

describe("settings", () => {
  it("parses env settings", () => {
    const s = settingsFromEnv({
      DAILY_REEL_TARGET: "5",
      PUBLISH_TIMES: "08:00,12:00,18:00,21:00",
      COMMENTARY_LANGUAGE: "bn",
      APPROVAL_MODE: "manual",
      SOURCE_RIGHTS_POLICY: "approved_only",
    });
    expect(s.dailyReelTarget).toBe(5);
    expect(s.publishTimes).toHaveLength(4);
    expect(s.commentaryLanguage).toBe("bn");
    expect(s.approvalMode).toBe("manual");
  });

  it("applies defaults", () => {
    const s = settingsFromEnv({});
    expect(s.dailyReelTarget).toBe(DEFAULT_SETTINGS.dailyReelTarget);
  });
});
