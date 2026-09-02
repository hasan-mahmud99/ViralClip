import { PublisherProvider } from "./types";
import { ProviderError } from "@viralclip/shared";
import { createReadStream, statSync } from "node:fs";
import { basename } from "node:path";

export interface FacebookPublisherConfig {
  accessToken: string;
  pageId: string;
  apiVersion?: string;
}

export class FacebookPublisherProvider implements PublisherProvider {
  readonly kind = "facebook-graph-api";
  constructor(private readonly config: FacebookPublisherConfig) {}

  isConfigured(): boolean {
    return Boolean(this.config.accessToken && this.config.pageId);
  }

  private graphUrl(path: string): string {
    const v = this.config.apiVersion ?? "v20.0";
    return `https://graph.facebook.com/${v}/${path}`;
  }

  private async uploadVideo(args: {
    filePath: string;
    caption: string;
    title?: string;
    scheduledUnix?: number;
    pageId: string;
  }) {
    const { filePath, caption, title, scheduledUnix, pageId } = args;
    const form = new FormData();
    const stat = statSync(filePath);
    const file = new Blob([createReadStream(filePath) as unknown as ArrayBuffer], { type: "video/mp4" });
    void file;
    form.append("source", new (require("node:buffer").File as any)([await readAll(filePath)], basename(filePath), {
      type: "video/mp4",
    }));
    form.append("description", caption);
    if (title) form.append("title", title);
    if (scheduledUnix) form.append("published", "false");
    if (scheduledUnix) form.append("scheduled_publish_time", String(scheduledUnix));

    const res = await fetch(this.graphUrl(`${pageId}/videos`), {
      method: "POST",
      headers: { Authorization: `Bearer ${this.config.accessToken}` },
      body: form,
    });
    if (!res.ok) {
      throw new ProviderError("FACEBOOK_HTTP", `Facebook HTTP ${res.status}: ${await res.text()}`, { retryable: res.status >= 500 });
    }
    const json = (await res.json()) as { id?: string };
    if (!json.id) throw new ProviderError("FACEBOOK_NO_ID", "Facebook returned no video id");
    return json;
  }

  async publishVideo(input: { filePath: string; caption: string; title?: string; pageId?: string }) {
    const pageId = input.pageId ?? this.config.pageId;
    const json = await this.uploadVideo({ ...input, pageId });
    return { platformPostId: json.id!, url: `https://facebook.com/${json.id}` };
  }

  async scheduleVideo(input: { filePath: string; caption: string; title?: string; pageId?: string; scheduledUnix: number }) {
    const pageId = input.pageId ?? this.config.pageId;
    const json = await this.uploadVideo({ ...input, pageId });
    return { platformPostId: json.id!, url: `https://facebook.com/${json.id}`, scheduledUnix: input.scheduledUnix };
  }

  async getStatus(opts: { pageId: string; postId: string }) {
    const url = this.graphUrl(`${opts.postId}?fields=status,created_time&access_token=${this.config.accessToken}`);
    const res = await fetch(url);
    if (!res.ok) throw new ProviderError("FACEBOOK_HTTP", `Facebook HTTP ${res.status}`);
    const json = (await res.json()) as { status?: string };
    return { status: json.status ?? "unknown" };
  }
}

async function readAll(filePath: string): Promise<Buffer> {
  const { readFile } = await import("node:fs/promises");
  return readFile(filePath);
}
