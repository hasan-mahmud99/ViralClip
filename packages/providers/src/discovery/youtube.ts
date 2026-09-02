import { DiscoveryProvider, DiscoveryCandidate } from "./types";
import { ProviderError } from "@viralclip/shared";

export interface YouTubeDiscoveryConfig {
  apiKey: string;
}

export class YouTubeDiscoveryProvider implements DiscoveryProvider {
  readonly kind = "youtube-data-api";
  constructor(private readonly config: YouTubeDiscoveryConfig) {
    if (!config.apiKey) throw new ProviderError("YOUTUBE_MISSING_KEY", "YouTube API key is not configured");
  }

  async search(opts: { queries: string[]; maxResults: number }): Promise<DiscoveryCandidate[]> {
    const out: DiscoveryCandidate[] = [];
    for (const query of opts.queries) {
      const url = new URL("https://www.googleapis.com/youtube/v3/search");
      url.searchParams.set("part", "snippet");
      url.searchParams.set("q", query);
      url.searchParams.set("type", "video");
      url.searchParams.set("maxResults", String(Math.min(10, opts.maxResults)));
      url.searchParams.set("key", this.config.apiKey);
      const res = await fetch(url.toString());
      if (!res.ok) throw new ProviderError("YOUTUBE_HTTP", `YouTube HTTP ${res.status}`);
      const json = (await res.json()) as {
        items?: { id?: { videoId?: string }; snippet?: { title?: string; channelId?: string; channelTitle?: string; description?: string; publishedAt?: string; thumbnails?: { high?: { url?: string } } } }[];
      };
      for (const item of json.items ?? []) {
        const id = item.id?.videoId;
        if (!id) continue;
        out.push({
          youtubeVideoId: id,
          title: item.snippet?.title ?? id,
          channelId: item.snippet?.channelId ?? null,
          channelName: item.snippet?.channelTitle ?? null,
          description: item.snippet?.description ?? null,
          publishedAt: item.snippet?.publishedAt ?? null,
          thumbnailUrl: item.snippet?.thumbnails?.high?.url ?? null,
          sourceUrl: `https://www.youtube.com/watch?v=${id}`,
          query,
        });
      }
    }
    return out;
  }
}
