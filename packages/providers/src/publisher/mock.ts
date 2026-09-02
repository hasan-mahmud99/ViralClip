import { PublisherProvider } from "./types";
import { randomUUID } from "node:crypto";

export class MockPublisherProvider implements PublisherProvider {
  readonly kind = "mock";
  constructor(private readonly pageId?: string) {}

  isConfigured(): boolean {
    return true;
  }

  async publishVideo(input: { filePath: string; caption: string; title?: string; pageId?: string }) {
    return { platformPostId: `mock-post-${randomUUID()}` };
  }

  async scheduleVideo(input: { filePath: string; caption: string; title?: string; pageId?: string; scheduledUnix: number }) {
    return { platformPostId: `mock-post-${randomUUID()}`, scheduledUnix: input.scheduledUnix };
  }

  async getStatus() {
    return { status: "published" };
  }
}
