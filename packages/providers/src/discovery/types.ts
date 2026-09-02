export interface DiscoveryCandidate {
  youtubeVideoId: string;
  title: string;
  channelId?: string | null;
  channelName?: string | null;
  description?: string | null;
  publishedAt?: string | null;
  durationSec?: number | null;
  thumbnailUrl?: string | null;
  sourceUrl: string;
  query: string;
}

export interface DiscoveryProvider {
  readonly kind: string;
  search(opts: { queries: string[]; maxResults: number }): Promise<DiscoveryCandidate[]>;
}
