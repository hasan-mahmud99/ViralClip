import { describe, it, expect } from "vitest";
import { publishDueCount, minutesSinceMidnight, currentPartsInZone } from "../../apps/worker/src/scheduler";

describe("scheduler helpers", () => {
  it("parses HH:MM to minutes", () => {
    expect(minutesSinceMidnight("09:00")).toBe(540);
    expect(minutesSinceMidnight("23:59")).toBe(1439);
  });

  it("counts publish slots due at a given wall-clock time", () => {
    const base = new Date("2026-01-10T03:30:00Z"); // UTC; tests timezone math only
    // With timezone UTC, 03:30 == 210 minutes after midnight.
    const count = publishDueCount({ timezone: "UTC", publishTimes: ["02:00", "03:20", "05:00"], now: base });
    expect(count).toBeGreaterThanOrEqual(1);
    expect(count).toBeLessThanOrEqual(2);
  });

  it("returns timezone parts", () => {
    const p = currentPartsInZone("Asia/Dhaka");
    expect(p.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(p.hours).toBeGreaterThanOrEqual(0);
    expect(p.hours).toBeLessThanOrEqual(23);
  });
});
