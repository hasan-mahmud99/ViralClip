import { createHash, randomUUID } from "node:crypto";

export function uuid(): string {
  return randomUUID();
}

export function sha256(input: string): string {
  return createHash("sha256").update(input).digest("hex");
}

export function sha1(input: string): string {
  return createHash("sha1").update(input).digest("hex");
}

export function nowIso(): string {
  return new Date().toISOString();
}

export function safeNow(iso?: string | null): string {
  return iso ?? nowIso();
}

export function clamp(n: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, n));
}

export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function stripHtml(s: string): string {
  return s.replace(/<[^>]*>/g, "").replace(/\s+/g, " ").trim();
}

export function truncate(s: string, max: number): string {
  return s.length <= max ? s : `${s.slice(0, max - 3)}...`;
}

export function secondsToIso(seconds: number): string {
  return new Date(seconds * 1000).toISOString();
}

export function durationBetweenIso(a: string, b: string): number {
  return new Date(b).getTime() - new Date(a).getTime();
}
