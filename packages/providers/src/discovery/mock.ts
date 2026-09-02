import { DiscoveryProvider, DiscoveryCandidate } from "./types";

export class MockDiscoveryProvider implements DiscoveryProvider {
  readonly kind = "mock";
  constructor(private readonly seed?: DiscoveryCandidate[]) {}

  async search(opts: { queries: string[]; maxResults: number }): Promise<DiscoveryCandidate[]> {
    const seeds = this.seed ?? [
      {
        youtubeVideoId: "mock-video-001",
        title: "I Tried The Impossible Challenge For 24 Hours",
        channelName: "Mock Creator",
        sourceUrl: "https://www.youtube.com/watch?v=mock-video-001",
        query: opts.queries[0] ?? "viral creator moments",
      },
      {
        youtubeVideoId: "mock-video-002",
        title: "Streamer's Most Unbelievable Reaction Ever",
        channelName: "Mock Streamer",
        sourceUrl: "https://www.youtube.com/watch?v=mock-video-002",
        query: opts.queries[0] ?? "viral creator moments",
      },
    ];
    return seeds.slice(0, opts.maxResults);
  }
}
