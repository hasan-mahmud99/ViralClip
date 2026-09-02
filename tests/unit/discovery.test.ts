import { describe, it, expect } from "vitest";
import { InMemoryStore } from "@viralclip/database";
import { runSourceDiscovery } from "../../apps/worker/src/discovery-processor";

const store = new InMemoryStore();
let callCount = 0;

const fakeDiscovery = {
  kind: "fake",
  async search() {
    callCount++;
    return [
      { youtubeVideoId: "vid1", title: "A", channelName: "c1", sourceUrl: "https://www.youtube.com/watch?v=vid1", query: "q" },
      { youtubeVideoId: "vid2", title: "B", channelName: "c2", sourceUrl: "https://www.youtube.com/watch?v=vid2", query: "q" },
    ];
  },
};

describe("discovery processor", () => {
  it("inserts new candidates, dedupes repeats, marks rights pending under approved_only", async () => {
    const r1 = await runSourceDiscovery(store, fakeDiscovery as never, {
      queries: ["q"],
      maxResults: 5,
      policy: "approved_only",
      trustedChannels: [],
    });
    expect(r1.inserted).toBe(2);

    const r2 = await runSourceDiscovery(store, fakeDiscovery as never, {
      queries: ["q"],
      maxResults: 5,
      policy: "approved_only",
      trustedChannels: [],
    });
    expect(r2.deduped).toBe(2);
    expect(r2.inserted).toBe(0);

    const sources = await store.listSources();
    expect(sources.length).toBe(2);
    expect(sources.every((s) => s.status === "RIGHTS_PENDING")).toBe(true);
    expect(callCount).toBe(2);
  });

  it("does not auto-download anything (no local file path ever set)", async () => {
    const sources = await store.listSources();
    for (const s of sources) {
      expect(s.localFilePath).toBeFalsy();
    }
  });
});
