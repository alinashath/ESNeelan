import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/src/lib/supabase";
import { storagePublicUrl } from "@/src/lib/storage-url";
import type { CategoryRow } from "@/src/data/category-utils";
import { collectSubtreeIds } from "@/src/data/category-utils";

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
};

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

      const { data: seller } = await supabase
        .from("profiles")
        .select("id, display_name")
        .eq("id", (a as { seller_id: string }).seller_id)
        .maybeSingle();

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
        seller,
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
      let names: Record<string, string> = {};
      if (ids.length) {
        const { data: profs } = await supabase
          .from("profiles")
          .select("id, display_name")
          .in("id", ids);
        names = Object.fromEntries(
          (profs ?? []).map((p) => [p.id, p.display_name ?? "Bidder"]),
        );
      }
      return list.map((b) => ({
        id: b.id,
        amount: Number(b.amount),
        created_at: b.created_at,
        bidder_display: names[b.bidder_id] ?? "Bidder",
      }));
    },
  });
}
