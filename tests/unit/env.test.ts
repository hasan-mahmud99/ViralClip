import { describe, it, expect } from "vitest";
import { loadEnv } from "@viralclip/shared";

describe("env", () => {
  it("parses a typical production env", () => {
    const cfg = loadEnv({
      GEMINI_API_KEY: "k",
      DATABASE_URL: "postgres://u:p@localhost/db",
      REDIS_URL: "redis://localhost:6379",
      META_ACCESS_TOKEN: "tok",
      META_PAGE_ID: "123",
      TIMEZONE: "Asia/Dhaka",
      DAILY_REEL_TARGET: "20",
    } as NodeJS.ProcessEnv);
    expect(cfg.DAILY_REEL_TARGET).toBe(20);
    expect(cfg.TIMEZONE).toBe("Asia/Dhaka");
    expect(cfg.SOURCE_RIGHTS_POLICY).toBe("approved_only");
  });
});
