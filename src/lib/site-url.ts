/**
 * Public site origin for canonical URLs, sharing, and Open Graph.
 * Set `EXPO_PUBLIC_SITE_URL` in production (e.g. `https://app.example.com`) so
 * native shares and static HTML meta resolve correctly. On web, falls back to
 * `window.location.origin` when unset.
 */
export function getPublicSiteOrigin(): string {
  const fromEnv = process.env.EXPO_PUBLIC_SITE_URL?.trim().replace(/\/$/, "");
  if (fromEnv) return fromEnv;
  if (typeof window !== "undefined" && window.location?.origin) {
    return window.location.origin;
  }
  return "";
}

export function buildAuctionPublicUrl(auctionId: string): string {
  const origin = getPublicSiteOrigin();
  const path = `/auction/${encodeURIComponent(auctionId)}`;
  if (!origin) return path;
  return `${origin}${path}`;
}

export function buildFeaturedArticlePublicUrl(slug: string): string {
  const origin = getPublicSiteOrigin();
  const path = `/article/${encodeURIComponent(slug)}`;
  if (!origin) return path;
  return `${origin}${path}`;
}
