import { DailyStats, Settings } from "@viralclip/shared";

export function computeDailyPlan(input: {
  settings: Pick<Settings, "dailyReelTarget">;
  publishedToday: number;
  ready: number;
  queued: number;
  failed: number;
}): DailyStats {
  const { publishedToday, ready, queued, failed } = input;
  const target = input.settings.dailyReelTarget;
  const alreadyCovered = publishedToday + ready + queued;
  const remaining = Math.max(0, target - alreadyCovered);
  return { target, publishedToday, ready, queued, failed, remaining };
}
