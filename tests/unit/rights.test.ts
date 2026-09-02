import { describe, it, expect } from "vitest";
import { evaluateSourceRights } from "../../apps/worker/src/rights";

describe("source rights policy", () => {
  const source = { rightsStatus: "UNKNOWN", creatorName: "creatorA", sourceUrl: "https://www.youtube.com/watch?v=x", sourcePlatform: "youtube" };

  it("approved_only blocks UNKNOWN automatically", () => {
    const d = evaluateSourceRights(source, "approved_only", []);
    expect(d.allowed).toBe(false);
    expect(d.nextStatus).toBe("RIGHTS_PENDING");
  });

  it("USER_APPROVED always allows", () => {
    const d = evaluateSourceRights({ ...source, rightsStatus: "USER_APPROVED" }, "approved_only", []);
    expect(d.allowed).toBe(true);
  });

  it("licensed_only allows LICENSED", () => {
    const d = evaluateSourceRights({ ...source, rightsStatus: "LICENSED" }, "licensed_only", []);
    expect(d.allowed).toBe(true);
  });

  it("trusted_sources requires trust AND explicit status", () => {
    const d = evaluateSourceRights({ ...source, creatorName: "knownCreator" }, "trusted_sources", ["knownCreator"]);
    expect(d.nextStatus).toBe("RIGHTS_PENDING"); // UNKNOWN still requires review
  });

  it("never auto-allows UNKNOWN with no permission evidence", () => {
    for (const policy of ["manual", "approved_only", "licensed_only", "trusted_sources"] as const) {
      const d = evaluateSourceRights({ ...source, rightsStatus: "UNKNOWN" }, policy, ["creatorA"]);
      expect(d.allowed).toBe(false);
    }
  });
});
