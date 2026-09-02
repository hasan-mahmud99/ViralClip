export function currentPartsInZone(timezone: string): { date: string; hours: number; minutes: number } {
  const fmt = new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", hour12: false,
  });
  const parts = fmt.formatToParts(new Date());
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? "";
  let hours = Number(get("hour"));
  if (hours === 24) hours = 0;
  const month = get("month"), day = get("day"), year = get("year");
  return { date: `${year}-${month}-${day}`, hours, minutes: Number(get("minute")) };
}

export function minutesSinceMidnight(hhmm: string): number {
  const [h, m] = hhmm.split(":").map(Number);
  return (h ?? 0) * 60 + (m ?? 0);
}

export function publishDueCount(opts: {
  timezone: string;
  publishTimes: string[];
  now?: Date;
}): number {
  const now = opts.now ?? new Date();
  const z = currentPartsInZone(opts.timezone);
  const nowMinutes = z.hours * 60 + z.minutes;
  return opts.publishTimes.filter((t) => {
    const target = minutesSinceMidnight(t);
    // Publish once per slot once we are at or slightly after it.
    return nowMinutes >= target - 1 && nowMinutes <= target + 90;
  }).length;
}
