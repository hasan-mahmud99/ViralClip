import { describe, it, expect } from "vitest";
import { runQa, probeMedia, toSrt, toAss } from "@viralclip/video";

describe("probe & qa utilities (pure logic without ffmpeg)", () => {
  it("builds SRT text", () => {
    const srt = toSrt([{ start: 0, end: 2.5, text: "hello" }]);
    expect(srt).toContain("hello");
    expect(srt).toContain("00:00:00,000 --> 00:00:02,500");
  });

  it("builds ASS text", () => {
    const ass = toAss([{ start: 0, end: 2, text: "bangla текст" }]);
    expect(ass).toContain("[Script Info]");
    expect(ass).toContain("Dialogue:");
  });

  it("probeMedia is a function", () => {
    expect(typeof probeMedia).toBe("function");
    expect(typeof runQa).toBe("function");
  });
});
