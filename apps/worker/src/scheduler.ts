export function cronForTime(hhmm: string): string {
  const [h, m] = hhmm.split(":").map((x) => Number(x));
  if (h === undefined || m === undefined || Number.isNaN(h) || Number.isNaN(m)) {
    throw new Error(`invalid time ${hhmm}`);
  }
  return `${m} ${h} * * *`;
}

export function nextOccurrence(hhmm: string, timezone: string): Date {
  // Compute next wall-clock occurrence of hhmm in the given IANA timezone.
  const [h, m] = hhmm.split(":").map(Number) as [number, number];
  const now = new Date();
  const parts = now.toLocaleString("en-US", { timeZone: timezone, hour12: false }).split(/[/,:\s]+/);
  const month = Number(parts[0]) - 1;
  const day = Number(parts[1]);
  const year = Number(parts[2]);
  let candidate = new Date(Date.UTC(year, month, day, h, m, 0, 0));
  if (candidate.getTime() <= now.getTime()) {
    candidate = new Date(Date.UTC(year, month, day + 1, h, m, 0, 0));
  }
  return candidate;
}
