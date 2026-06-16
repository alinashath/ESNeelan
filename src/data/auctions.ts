import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/src/lib/supabase";
import { storagePublicUrl } from "@/src/lib/storage-url";
import { getAvatarPublicUrl } from "@/src/lib/avatar";
import type { CategoryRow } from "@/src/data/category-utils";
import { collectSubtreeIds } from "@/src/data/category-utils";
import { buildAuctionListPresentation } from "@/src/lib/auction-list-presentation";
import type { AuctionCardAuction } from "@/src/components/ui/AuctionCard";

export type { CategoryRow };

export type AuctionListRow = {
  id: string;
  title: string;
  description?: string;
  status: string;
  ends_at: string;
  starts_at: string;
  current_highest_bid: number | null;
  starting_price: number;
  bid_count: number;
  category_id: string | null;
  seller_id: string;
  image_path: string | null;
  is_featured?: boolean;
  featured_sort_order?: number | null;
  item_condition?: string | null;
  delivery_options?: string[] | null;
  listing_attributes?: unknown;
  item_condition_label?: string;
  listing_detail_chip_labels?: string[];
};

/** Aggregate of `public.seller_ratings` for a seller (buyer feedback after completed sales). */
export type SellerRatingSummary = { avg: number; count: number };

export function useActiveAuctions(filters?: {
  categoryId?: string | null;
  search?: string;
  minPrice?: number;
  maxPrice?: number;
  curatedCategories?: CategoryRow[];
}) {
  return useQuery({
    queryKey: ["auctions", "active", filters],
    queryFn: async () => {
      let auctionIds: string[] | null = null;
      if (filters?.categoryId) {
        if (filters.curatedCategories?.length) {
          const subtree = collectSubtreeIds(
            filters.curatedCategories,
            filters.categoryId,
          );
          const { data: links, error: linkErr } = await supabase
            .from("auction_categories")
            .select("auction_id")
            .in("category_id", subtree);
          if (linkErr) throw linkErr;
          auctionIds = [...new Set((links ?? []).map((r) => r.auction_id))];
          if (auctionIds.length === 0) {
            return [];
          }
        }
      }

      let q = supabase
        .from("auctions")
        .select(
          `
          id, title, description, status, ends_at, starts_at, current_highest_bid, starting_price, bid_count, category_id, seller_id, is_featured, featured_sort_order,
          item_condition, delivery_options, listing_attributes,
          auction_images ( storage_path, sort_order )
        `,
        )
        .eq("status", "active")
        .order("is_featured", { ascending: false })
        .order("featured_sort_order", { ascending: true, nullsFirst: false })
        .order("created_at", { ascending: false });

      if (auctionIds) {
        q = q.in("id", auctionIds);
      } else if (filters?.categoryId) {
        q = q.eq("category_id", filters.categoryId);
      }
      if (filters?.search) {
        q = q.ilike("title", `%${filters.search}%`);
      }
      if (filters?.minPrice != null) {
        q = q.gte("starting_price", filters.minPrice);
      }
      if (filters?.maxPrice != null) {
        q = q.lte("starting_price", filters.maxPrice);
      }

      const { data, error } = await q;
      if (error) throw error;
      const rows = (data ?? []) as unknown as Array<
        Omit<AuctionListRow, "image_path"> & {
          auction_images?: { storage_path: string; sort_order: number }[];
        }
      >;
      return rows.map((r) => {
        const imgs = [...(r.auction_images ?? [])].sort(
          (a, b) => a.sort_order - b.sort_order,
        );
        const first = imgs[0]?.storage_path ?? null;
        const pres = buildAuctionListPresentation(filters?.curatedCategories, {
          category_id: r.category_id,
          item_condition: (r as { item_condition?: string | null }).item_condition,
          delivery_options: (r as { delivery_options?: string[] | null }).delivery_options,
          listing_attributes: (r as { listing_attributes?: unknown }).listing_attributes,
        });
        return {
          id: r.id,
          title: r.title,
          description: (r as { description?: string | null }).description ?? "",
          status: r.status,
          ends_at: r.ends_at,
          starts_at: r.starts_at,
          current_highest_bid: r.current_highest_bid,
          starting_price: Number(r.starting_price),
          bid_count: r.bid_count,
          category_id: r.category_id,
          seller_id: r.seller_id,
          is_featured: Boolean((r as { is_featured?: boolean }).is_featured),
          featured_sort_order:
            (r as { featured_sort_order?: number | null }).featured_sort_order ?? null,
          image_url: first
            ? storagePublicUrl("auction-images", first)
            : null,
          ...pres,
        };
      });
    },
  });
}

export type ExploreListingScope = "all" | "active" | "ended";

export type ExploreHasBidsFilter = "any" | "with" | "without";

export type ExploreCatalogFilters = {
  categoryId?: string | null;
  search?: string;
  listingScope?: ExploreListingScope;
  hasBids?: ExploreHasBidsFilter;
  curatedCategories?: CategoryRow[];
  /** When set, restrict catalog to this seller’s listings (storefront). */
  sellerId?: string;
};

function compareExploreRows(
  a: { status: string; bid_count: number; is_featured: boolean; ends_at: string },
  b: { status: string; bid_count: number; is_featured: boolean; ends_at: string },
): number {
  const statusRank = (s: string) => (s === "active" ? 0 : s === "ended" ? 1 : 2);
  const s = statusRank(a.status) - statusRank(b.status);
  if (s !== 0) return s;
  if (Boolean(b.is_featured) !== Boolean(a.is_featured)) {
    return a.is_featured ? -1 : 1;
  }
  const bids = (b.bid_count ?? 0) - (a.bid_count ?? 0);
  if (bids !== 0) return bids;
  return new Date(a.ends_at).getTime() - new Date(b.ends_at).getTime();
}

/** Explore catalog: live + ended (default), filters, and sort — active first, then by bids & featured. */
export function useExploreCatalog(filters?: ExploreCatalogFilters) {
  const scope = filters?.listingScope ?? "all";
  const hasBids = filters?.hasBids ?? "any";

  return useQuery({
    queryKey: ["auctions", "explore", filters],
    queryFn: async () => {
      let auctionIds: string[] | null = null;
      if (filters?.categoryId) {
        if (filters.curatedCategories?.length) {
          const subtree = collectSubtreeIds(
            filters.curatedCategories,
            filters.categoryId,
          );
          const { data: links, error: linkErr } = await supabase
            .from("auction_categories")
            .select("auction_id")
            .in("category_id", subtree);
          if (linkErr) throw linkErr;
          auctionIds = [...new Set((links ?? []).map((r) => r.auction_id))];
          if (auctionIds.length === 0) {
            return [];
          }
        }
      }

      let q = supabase
        .from("auctions")
        .select(
          `
          id, title, description, status, ends_at, starts_at, current_highest_bid, starting_price, bid_count, category_id, seller_id, is_featured, featured_sort_order,
          item_condition, delivery_options, listing_attributes,
          auction_images ( storage_path, sort_order )
        `,
        )
        .order("created_at", { ascending: false });

      if (scope === "active") {
        q = q.eq("status", "active");
      } else if (scope === "ended") {
        q = q.eq("status", "ended");
      } else {
        q = q.in("status", ["active", "ended"]);
      }

      if (filters?.sellerId) {
        q = q.eq("seller_id", filters.sellerId);
      }

      if (auctionIds) {
        q = q.in("id", auctionIds);
      } else if (filters?.categoryId) {
        q = q.eq("category_id", filters.categoryId);
      }
      if (filters?.search?.trim()) {
        q = q.ilike("title", `%${filters.search.trim()}%`);
      }
      if (hasBids === "with") {
        q = q.gt("bid_count", 0);
      } else if (hasBids === "without") {
        q = q.eq("bid_count", 0);
      }

      const { data, error } = await q;
      if (error) throw error;
      const rows = (data ?? []) as unknown as Array<
        Omit<AuctionListRow, "image_path"> & {
          auction_images?: { storage_path: string; sort_order: number }[];
        }
      >;

      const mapped = rows.map((r) => {
        const imgs = [...(r.auction_images ?? [])].sort(
          (a, b) => a.sort_order - b.sort_order,
        );
        const first = imgs[0]?.storage_path ?? null;
        const pres = buildAuctionListPresentation(filters?.curatedCategories, {
          category_id: r.category_id,
          item_condition: (r as { item_condition?: string | null }).item_condition,
          delivery_options: (r as { delivery_options?: string[] | null }).delivery_options,
          listing_attributes: (r as { listing_attributes?: unknown }).listing_attributes,
        });
        return {
          id: r.id,
          title: r.title,
          description: (r as { description?: string | null }).description ?? "",
          status: r.status,
          ends_at: r.ends_at,
          starts_at: r.starts_at,
          current_highest_bid: r.current_highest_bid,
          starting_price: Number(r.starting_price),
          bid_count: r.bid_count,
          category_id: r.category_id,
          seller_id: r.seller_id,
          is_featured: Boolean((r as { is_featured?: boolean }).is_featured),
          featured_sort_order:
            (r as { featured_sort_order?: number | null }).featured_sort_order ?? null,
          image_url: first
            ? storagePublicUrl("auction-images", first)
            : null,
          ...pres,
        };
      });

      return [...mapped].sort(compareExploreRows);
    },
  });
}

export function useAuctionDetail(id: string) {
  return useQuery({
    queryKey: ["auction", id],
    enabled: !!id,
    queryFn: async () => {
      const { data: a, error } = await supabase
        .from("auctions")
        .select(
          `
          *,
          auction_categories (
            category_id,
            sort_order,
            categories ( name, slug )
          ),
          auction_images ( id, storage_path, sort_order )
        `,
        )
        .eq("id", id)
        .maybeSingle();
      if (error) throw error;
      if (!a) return null;

      const sellerId = (a as { seller_id: string }).seller_id;

      const { data: seller } = await supabase
        .from("profiles")
        .select("id, display_name, avatar_storage_path")
        .eq("id", sellerId)
        .maybeSingle();

      const sellerWithAvatar = seller
        ? {
            id: seller.id,
            display_name: seller.display_name,
            avatar_url: getAvatarPublicUrl(
              (seller as { avatar_storage_path?: string | null }).avatar_storage_path ??
                null,
            ),
          }
        : null;

      const { data: starRows, error: starsErr } = await supabase
        .from("seller_ratings")
        .select("stars")
        .eq("seller_id", sellerId);
      if (starsErr) throw starsErr;
      const starsList = (starRows ?? []) as { stars: number }[];
      let seller_rating_summary: SellerRatingSummary | null = null;
      if (starsList.length > 0) {
        const sum = starsList.reduce((acc, r) => acc + Number(r.stars), 0);
        seller_rating_summary = { avg: sum / starsList.length, count: starsList.length };
      }

      const imgs = [
        ...((a as { auction_images?: { storage_path: string; sort_order: number }[] })
          .auction_images ?? []),
      ].sort((x, y) => x.sort_order - y.sort_order);
      const image_urls = imgs.map((i) =>
        storagePublicUrl("auction-images", i.storage_path),
      );

      const row = a as Record<string, unknown>;
      const ac = row.auction_categories as
        | { sort_order: number; categories: { name: string } | null }[]
        | undefined;
      let category_names: string[] =
        ac != null
          ? [...ac]
              .sort((x, y) => x.sort_order - y.sort_order)
              .map((r) => r.categories?.name)
              .filter((x): x is string => !!x)
          : [];
      if (category_names.length === 0 && row.category_id) {
        const { data: pc } = await supabase
          .from("categories")
          .select("name")
          .eq("id", row.category_id as string)
          .maybeSingle();
        if (pc?.name) category_names = [pc.name];
      }

      return {
        ...row,
        image_urls,
        seller: sellerWithAvatar,
        seller_rating_summary,
        category_names,
      };
    },
  });
}

/** Curated root categories that currently have at least one active listing (in subtree). */
export function useActiveCategoryRoots(curated: CategoryRow[] | undefined) {
  const key = (curated ?? []).map((c) => c.id).join(",");
  return useQuery({
    queryKey: ["category-roots-active", key],
    enabled: !!curated?.length,
    queryFn: async () => {
      const list = curated ?? [];
      const { data: active, error: e1 } = await supabase
        .from("auctions")
        .select("id, category_id")
        .eq("status", "active");
      if (e1) throw e1;
      const auctionIds = (active ?? []).map((r) => r.id);
      if (auctionIds.length === 0) {
        return [] as CategoryRow[];
      }
      const { data: links, error: e2 } = await supabase
        .from("auction_categories")
        .select("category_id, auction_id")
        .in("auction_id", auctionIds);
      if (e2) throw e2;

      const catIds = new Set<string>();
      for (const row of active ?? []) {
        if (row.category_id) catIds.add(row.category_id);
      }
      for (const row of links ?? []) {
        catIds.add(row.category_id);
      }

      const byId = new Map(list.map((c) => [c.id, c]));
      function rootOf(cid: string): string | null {
        let cur = byId.get(cid);
        if (!cur) return null;
        while (cur.parent_id) {
          const p = byId.get(cur.parent_id);
          if (!p) break;
          cur = p;
        }
        return cur.id;
      }
      const roots = new Set<string>();
      for (const cid of catIds) {
        const r = rootOf(cid);
        if (r) roots.add(r);
      }
      return list
        .filter((c) => c.parent_id == null && roots.has(c.id))
        .sort(
          (a, b) =>
            a.sort_order - b.sort_order || a.name.localeCompare(b.name),
        );
    },
  });
}

export function useCuratedCategories() {
  return useQuery({
    queryKey: ["categories", "curated"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("categories")
        .select("id, name, slug, parent_id, sort_order, ecosystem")
        .eq("ecosystem", "curated")
        .order("sort_order", { ascending: true })
        .order("name", { ascending: true });
      if (error) throw error;
      return (data ?? []) as CategoryRow[];
    },
  });
}

/**
 * Distinct live + ended listing counts per curated category (listing matches if any
 * `auction_categories` or legacy `category_id` falls in that category’s subtree).
 */
export function useExploreCategoryCounts(curated: CategoryRow[] | undefined) {
  const key = (curated ?? []).map((c) => c.id).join(",");
  return useQuery({
    queryKey: ["categories", "explore-counts", key],
    enabled: !!curated?.length,
    queryFn: async () => {
      const list = curated ?? [];
      const { data: auctions, error: e1 } = await supabase
        .from("auctions")
        .select("id, category_id")
        .in("status", ["active", "ended"]);
      if (e1) throw e1;
      const rows = (auctions ?? []) as { id: string; category_id: string | null }[];
      const auctionToCats = new Map<string, Set<string>>();
      for (const r of rows) {
        const s = new Set<string>();
        if (r.category_id) s.add(String(r.category_id));
        auctionToCats.set(String(r.id), s);
      }
      const ids = rows.map((r) => String(r.id));
      if (ids.length > 0) {
        const { data: links, error: e2 } = await supabase
          .from("auction_categories")
          .select("auction_id, category_id")
          .in("auction_id", ids);
        if (e2) throw e2;
        for (const row of links ?? []) {
          const aid = String((row as { auction_id: string }).auction_id);
          const cid = String((row as { category_id: string }).category_id);
          if (!auctionToCats.has(aid)) auctionToCats.set(aid, new Set());
          auctionToCats.get(aid)!.add(cid);
        }
      }

      const counts: Record<string, number> = {};
      for (const c of list) {
        const subtree = new Set(collectSubtreeIds(list, c.id));
        let n = 0;
        for (const cats of auctionToCats.values()) {
          let hit = false;
          for (const cat of cats) {
            if (subtree.has(cat)) {
              hit = true;
              break;
            }
          }
          if (hit) n += 1;
        }
        counts[c.id] = n;
      }
      return counts;
    },
  });
}

export function useCategories() {
  return useQuery({
    queryKey: ["categories"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("categories")
        .select("id, name, slug, parent_id, sort_order, ecosystem")
        .order("ecosystem", { ascending: true })
        .order("sort_order", { ascending: true })
        .order("name", { ascending: true });
      if (error) throw error;
      return (data ?? []) as CategoryRow[];
    },
  });
}

export type SellerPublicProfile = {
  id: string;
  display_name: string | null;
  avatar_url: string | null;
  seller_rating_summary: SellerRatingSummary | null;
};

/** Public storefront header: name, avatar URL, aggregate rating (RLS must allow read). */
export function useSellerPublicProfile(sellerId: string) {
  return useQuery({
    queryKey: ["seller", "public", sellerId],
    enabled: !!sellerId,
    queryFn: async () => {
      const { data: p, error } = await supabase
        .from("profiles")
        .select("id, display_name, avatar_storage_path")
        .eq("id", sellerId)
        .maybeSingle();
      if (error) throw error;
      if (!p) return null;

      const { data: starRows, error: starsErr } = await supabase
        .from("seller_ratings")
        .select("stars")
        .eq("seller_id", sellerId);
      if (starsErr) throw starsErr;
      const starsList = (starRows ?? []) as { stars: number }[];
      let seller_rating_summary: SellerRatingSummary | null = null;
      if (starsList.length > 0) {
        const sum = starsList.reduce((acc, r) => acc + Number(r.stars), 0);
        seller_rating_summary = {
          avg: sum / starsList.length,
          count: starsList.length,
        };
      }

      return {
        id: p.id,
        display_name: p.display_name,
        avatar_url: getAvatarPublicUrl(
          (p as { avatar_storage_path?: string | null }).avatar_storage_path ?? null,
        ),
        seller_rating_summary,
      } satisfies SellerPublicProfile;
    },
  });
}

export function useAuctionBids(auctionId: string) {
  return useQuery({
    queryKey: ["bids", auctionId],
    enabled: !!auctionId,
    queryFn: async () => {
      const { data: bids, error } = await supabase
        .from("bids")
        .select("id, amount, created_at, bidder_id")
        .eq("auction_id", auctionId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      const list = bids ?? [];
      const ids = [...new Set(list.map((b) => b.bidder_id))];
      let profById: Record<
        string,
        { name: string; avatar_url: string | null }
      > = {};
      if (ids.length) {
        const { data: profs } = await supabase
          .from("profiles")
          .select("id, display_name, avatar_storage_path")
          .in("id", ids);
        profById = Object.fromEntries(
          (profs ?? []).map((p) => [
            p.id,
            {
              name: p.display_name ?? "Bidder",
              avatar_url: getAvatarPublicUrl(
                (p as { avatar_storage_path?: string | null }).avatar_storage_path ??
                  null,
              ),
            },
          ]),
        );
      }
      return list.map((b) => {
        const p = profById[b.bidder_id];
        return {
          id: b.id,
          amount: Number(b.amount),
          created_at: b.created_at,
          bidder_display: p?.name ?? "Bidder",
          bidder_avatar_url: p?.avatar_url ?? null,
        };
      });
    },
  });
}

function mapAuctionEmbedRow(data: {
  id: unknown;
  title: unknown;
  status: unknown;
  ends_at: unknown;
  current_highest_bid: unknown;
  starting_price: unknown;
  bid_count: unknown;
  auction_images?: { storage_path: string; sort_order: number }[];
}): AuctionCardAuction {
  const imgs = [...(data.auction_images ?? [])].sort((a, b) => a.sort_order - b.sort_order);
  const first = imgs[0]?.storage_path ?? null;
  return {
    id: String(data.id),
    title: String(data.title),
    status: String(data.status),
    ends_at: String(data.ends_at),
    current_highest_bid:
      data.current_highest_bid != null ? Number(data.current_highest_bid) : null,
    starting_price: Number(data.starting_price),
    bid_count: Number(data.bid_count ?? 0),
    image_url: first ? storagePublicUrl("auction-images", first) : null,
  };
}

/** Single listing for article embeds (respects auction RLS for readers). */
export function useAuctionEmbedById(auctionId: string | null | undefined, options?: { enabled?: boolean }) {
  return useQuery<AuctionCardAuction | null, Error>({
    queryKey: ["auctions", "article-embed", auctionId],
    enabled: Boolean(auctionId) && options?.enabled !== false,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("auctions")
        .select(
          `
          id, title, status, ends_at, current_highest_bid, starting_price, bid_count,
          auction_images ( storage_path, sort_order )
        `,
        )
        .eq("id", String(auctionId))
        .maybeSingle();
      if (error) throw error;
      if (!data) return null;
      return mapAuctionEmbedRow(data as Parameters<typeof mapAuctionEmbedRow>[0]);
    },
  });
}

export type AuctionArticleSearchHit = {
  id: string;
  title: string;
  status: string;
  image_url: string | null;
};

/** Admin: search listings by title to attach to a featured article block. */
export function useAdminAuctionSearchForArticles(
  search: string,
  options?: { enabled?: boolean },
) {
  const q = search.trim();
  return useQuery<AuctionArticleSearchHit[], Error>({
    queryKey: ["admin", "featured-articles", "auction-search", q],
    enabled: (options?.enabled !== false) && q.length >= 2,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("auctions")
        .select(
          `
          id, title, status,
          auction_images ( storage_path, sort_order )
        `,
        )
        .ilike("title", `%${q}%`)
        .order("created_at", { ascending: false })
        .limit(25);
      if (error) throw error;
      const rows = (data ?? []) as Array<{
        id: string;
        title: string;
        status: string;
        auction_images?: { storage_path: string; sort_order: number }[];
      }>;
      return rows.map((r) => {
        const imgs = [...(r.auction_images ?? [])].sort((a, b) => a.sort_order - b.sort_order);
        const first = imgs[0]?.storage_path ?? null;
        return {
          id: r.id,
          title: r.title,
          status: r.status,
          image_url: first ? storagePublicUrl("auction-images", first) : null,
        };
      });
    },
  });
}
