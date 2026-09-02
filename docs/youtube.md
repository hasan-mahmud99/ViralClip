# YouTube discovery

- Official YouTube Data API v3 `search` via `YouTubeDiscoveryProvider` when `YOUTUBE_API_KEY` is set.
- `MockDiscoveryProvider` is used when the key is absent (mock/dev).
- Discovery candidates carry `youtubeVideoId`, channel metadata, and query provenance for dedup/history.
- Ingestion is separated from discovery (see rights policy): a discovered YouTube video only proceeds when the configured ingestion/source policy allows it.

