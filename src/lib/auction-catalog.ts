import { isAuctionLiveForUi, isAuctionSoldForUi } from "@/src/lib/auction-live";

/** Statuses shown on home, explore (default), and featured carousel. */
export const CATALOG_LISTING_STATUSES = [
  "active",
  "ended",
  "completed",
  "won",
  "paid",
] as const;

/** Non-live catalog rows (ended without sale, or sold / settled). */
export const CATALOG_ENDED_STATUSES = ["ended", "completed", "won", "paid"] as const;

export type CatalogListingRow = {
  status: string;
  ends_at: string;
  bid_count: number;
  is_featured: boolean;
  featured_sort_order?: number | null;
};

/** Lower rank = higher in list. Live first, then closed active, ended, sold. */
export function catalogListingRank(status: string, endsAt?: string | null): number {
  if (isAuctionLiveForUi(status, endsAt)) return 0;
  const s = String(status).trim().toLowerCase();
  if (s === "active") return 1;
  if (s === "ended") return 2;
  if (isAuctionSoldForUi(status)) return 3;
  return 4;
}

/** Home / explore sort: live → featured order → bid activity → recency. */
export function compareCatalogListings(a: CatalogListingRow, b: CatalogListingRow): number {
  const rank =
    catalogListingRank(a.status, a.ends_at) - catalogListingRank(b.status, b.ends_at);
  if (rank !== 0) return rank;

  if (Boolean(b.is_featured) !== Boolean(a.is_featured)) {
    return a.is_featured ? -1 : 1;
  }
  if (a.is_featured && b.is_featured) {
    const ao = a.featured_sort_order ?? 999_999;
    const bo = b.featured_sort_order ?? 999_999;
    if (ao !== bo) return ao - bo;
  }

  const bids = (b.bid_count ?? 0) - (a.bid_count ?? 0);
  if (bids !== 0) return bids;

  return new Date(b.ends_at).getTime() - new Date(a.ends_at).getTime();
}
