import type { RightsPolicy } from "@viralclip/shared";

type RightsSource = {
  rightsStatus: string;
  creatorName?: string | null;
  channelId?: string | null;
  sourceUrl: string;
  sourcePlatform?: string | null;
};

/**
 * Right/approval policy gate.
 *
 * This is intentionally conservative: no status is auto-treated as "legally safe".
 * "approved" means a human or an explicitly configured trusted/creator source has granted
 * permission according to the configured policy — never an automatic copyright claim.
 */

export type RightsDecision = {
  allowed: boolean;
  reason: string;
  nextStatus: string;
};

export function evaluateSourceRights(
  source: RightsSource,
  policy: RightsPolicy,
  trustedChannels: string[] = []
): RightsDecision {
  if (source.rightsStatus === "BLOCKED") {
    return { allowed: false, reason: "source blocked", nextStatus: "BLOCKED" };
  }

  // Explicit human/user approval always wins.
  if (source.rightsStatus === "USER_APPROVED") {
    return { allowed: true, reason: "user approved source", nextStatus: "APPROVED" };
  }

  switch (policy) {
    case "manual":
      // manual = every source must be individually reviewed.
      return { allowed: false, reason: "manual policy: requires review", nextStatus: "RIGHTS_PENDING" };

    case "approved_only":
      return { allowed: false, reason: "approved_only policy: requires USER_APPROVED", nextStatus: "RIGHTS_PENDING" };

    case "licensed_only": {
      const licensed = source.rightsStatus === "LICENSED" || source.rightsStatus === "PERMISSION_GRANTED" || source.rightsStatus === "PLATFORM_PERMITTED";
      return licensed
        ? { allowed: true, reason: "licensed/permissioned source", nextStatus: "APPROVED" }
        : { allowed: false, reason: "not a licensed source", nextStatus: "RIGHTS_PENDING" };
    }

    case "trusted_sources": {
      const trusted = Boolean(
        source.creatorName &&
          (trustedChannels.includes(source.creatorName) ||
            (source.channelId ? trustedChannels.includes(source.channelId) : false))
      );
      const safeStatuses = ["LICENSED", "PERMISSION_GRANTED", "CREATOR_PROVIDED", "PUBLIC_DOMAIN", "CREATIVE_COMMONS", "PLATFORM_PERMITTED", "USER_APPROVED"];
      if (trusted && safeStatuses.includes(source.rightsStatus)) {
        return { allowed: true, reason: "trusted + explicitly permitted source", nextStatus: "APPROVED" };
      }
      if (trusted && source.rightsStatus === "UNKNOWN") {
        return { allowed: false, reason: "trusted source but rights unknown - still requires review", nextStatus: "RIGHTS_PENDING" };
      }
      return { allowed: false, reason: "not a trusted/permitted source", nextStatus: "RIGHTS_PENDING" };
    }
  }
}

type PlatformSource = { sourcePlatform?: string | null; sourceUrl: string };
type IngestSource = { localFilePath?: string | null; rightsStatus: string; status: string };

export function isDiscoverablePlatform(source: PlatformSource): boolean {
  // We only *search* public metadata. Private/DRM/paywalled content is never fetched.
  return source.sourcePlatform === "youtube" || source.sourceUrl.startsWith("https://www.youtube.com");
}

/** Sources that only have public metadata but no permitted media path stay reviewable. */
export function ingestionReady(source: IngestSource): boolean {
  if (source.rightsStatus === "BLOCKED") return false;
  return Boolean(source.localFilePath) && source.status === "APPROVED";
}
