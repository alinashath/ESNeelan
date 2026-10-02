import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/src/lib/supabase";
import { storagePublicUrl } from "@/src/lib/storage-url";
import { SELLER_COLLECTION_COVERS_BUCKET, sellerCollectionCoverPublicUrl } from "@/src/lib/seller-collection-cover";

export type SellerCollectionRow = {
  id: string;
  seller_id: string;
  name: string;
  description: string;
  cover_storage_path: string | null;
  cover_url: string | null;
  created_at: string;
  updated_at: string;
  is_featured: boolean;
  featured_sort_order: number | null;
  view_count: number;
  item_count?: number;
  seller_display_name?: string | null;
};

const collectionListSelect =
  "id, seller_id, name, description, cover_storage_path, created_at, updated_at, is_featured, featured_sort_order, view_count";

function mapCollectionRow(row: Record<string, unknown>): SellerCollectionRow {
  const path = (row.cover_storage_path as string | null) ?? null;
  const profiles = row.profiles as { display_name?: string | null } | null | undefined;
  return {
    id: String(row.id),
    seller_id: String(row.seller_id),
    name: String(row.name ?? ""),
    description: String(row.description ?? ""),
    cover_storage_path: path,
    cover_url: path ? storagePublicUrl(SELLER_COLLECTION_COVERS_BUCKET, path) : null,
    created_at: String(row.created_at ?? ""),
    updated_at: String(row.updated_at ?? ""),
    is_featured: Boolean(row.is_featured),
    featured_sort_order:
      row.featured_sort_order != null && Number.isFinite(Number(row.featured_sort_order))
        ? Number(row.featured_sort_order)
        : null,
    view_count: Number.isFinite(Number(row.view_count)) ? Number(row.view_count) : 0,
    item_count: typeof row.item_count === "number" ? row.item_count : undefined,
    seller_display_name:
      typeof profiles?.display_name === "string"
        ? profiles.display_name
        : typeof row.seller_display_name === "string"
          ? row.seller_display_name
          : null,
  };
}

function compareCollectionsForHub(a: SellerCollectionRow, b: SellerCollectionRow): number {
  if (Boolean(b.is_featured) !== Boolean(a.is_featured)) {
    return a.is_featured ? -1 : 1;
  }
  if (a.is_featured && b.is_featured) {
    const ao = a.featured_sort_order ?? 999_999;
    const bo = b.featured_sort_order ?? 999_999;
    if (ao !== bo) return ao - bo;
  }
  if (b.view_count !== a.view_count) return b.view_count - a.view_count;
  return String(b.created_at).localeCompare(String(a.created_at));
}

function compareCollectionsForHome(a: SellerCollectionRow, b: SellerCollectionRow): number {
  if (Boolean(b.is_featured) !== Boolean(a.is_featured)) {
    return a.is_featured ? -1 : 1;
  }
  if (b.view_count !== a.view_count) return b.view_count - a.view_count;
  return String(b.created_at).localeCompare(String(a.created_at));
}

/** Public storefront: a seller’s collections (metadata only). */
export function useSellerCollectionsCatalog(sellerId: string | undefined) {
  return useQuery({
    queryKey: ["seller-collections", "catalog", sellerId],
    enabled: !!sellerId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("seller_collections")
        .select(collectionListSelect)
        .eq("seller_id", sellerId as string)
        .order("is_featured", { ascending: false })
        .order("featured_sort_order", { ascending: true, nullsFirst: false })
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []).map((r) => mapCollectionRow(r as Record<string, unknown>));
    },
  });
}

/** Collections hub: latest public collections, featured first. */
export function useCollectionsHub() {
  return useQuery({
    queryKey: ["seller-collections", "hub"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("seller_collections")
        .select(`${collectionListSelect}, profiles!seller_collections_seller_id_fkey ( display_name )`)
        .order("created_at", { ascending: false })
        .limit(100);
      if (error) throw error;
      const rows = (data ?? []).map((r) => mapCollectionRow(r as Record<string, unknown>));
      return rows.sort(compareCollectionsForHub);
    },
  });
}

/** Home rail: featured, then most viewed, then latest. */
export function useHomeCollections(limit = 12) {
  return useQuery({
    queryKey: ["seller-collections", "home", limit],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("seller_collections")
        .select(collectionListSelect)
        .order("is_featured", { ascending: false })
        .order("view_count", { ascending: false })
        .order("created_at", { ascending: false })
        .limit(Math.max(1, Math.min(limit, 40)));
      if (error) throw error;
      return (data ?? [])
        .map((r) => mapCollectionRow(r as Record<string, unknown>))
        .sort(compareCollectionsForHome);
    },
  });
}

/** Fire-and-forget public view increment (RPC). */
export async function recordSellerCollectionView(collectionId: string): Promise<void> {
  const id = collectionId.trim();
  if (!id) return;
  const { error } = await supabase.rpc("increment_seller_collection_view", {
    p_collection_id: id,
  });
  if (error) {
    console.warn("increment_seller_collection_view", error.message);
  }
}

/** Logged-in seller’s collections. */
export function useMySellerCollections() {
  return useQuery({
    queryKey: ["seller-collections", "mine"],
    queryFn: async () => {
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user) return [];
      const { data, error } = await supabase
        .from("seller_collections")
        .select(collectionListSelect)
        .eq("seller_id", auth.user.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []).map((r) => mapCollectionRow(r as Record<string, unknown>));
    },
  });
}

export type CollectionAuctionBrief = {
  id: string;
  title: string;
  status: string;
  ends_at: string;
  current_highest_bid: number | null;
  starting_price: number;
  bid_count: number;
  image_url: string | null;
  sort_order: number;
};

export type SellerCollectionDetail = SellerCollectionRow & {
  items: CollectionAuctionBrief[];
};

export function useSellerCollectionDetail(collectionId: string | undefined) {
  return useQuery({
    queryKey: ["seller-collection", collectionId],
    enabled: !!collectionId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("seller_collections")
        .select(
          `
          ${collectionListSelect},
          seller_collection_items (
            sort_order,
            auction_id,
            auctions (
              id, title, status, ends_at, current_highest_bid, starting_price, bid_count,
              auction_images ( storage_path, sort_order )
            )
          )
        `,
        )
        .eq("id", collectionId as string)
        .maybeSingle();
      if (error) throw error;
      if (!data) return null;
      const row = data as Record<string, unknown>;
      const rawItems = (row.seller_collection_items as Record<string, unknown>[]) ?? [];
      const items: CollectionAuctionBrief[] = rawItems
        .map((it) => {
          const a = it.auctions as
            | {
                id: string;
                title: string;
                status: string;
                ends_at?: string;
                current_highest_bid?: number | null;
                starting_price?: number | string;
                bid_count?: number;
                auction_images?: { storage_path: string; sort_order: number }[];
              }
            | null
            | undefined;
          if (!a?.id) return null;
          const imgs = [...(a.auction_images ?? [])].sort((x, y) => x.sort_order - y.sort_order);
          const first = imgs[0]?.storage_path;
          return {
            id: String(a.id),
            title: String(a.title ?? ""),
            status: String(a.status ?? ""),
            ends_at: String(a.ends_at ?? ""),
            current_highest_bid:
              a.current_highest_bid != null ? Number(a.current_highest_bid) : null,
            starting_price: Number(a.starting_price ?? 0),
            bid_count: Number(a.bid_count ?? 0),
            image_url: first ? storagePublicUrl("auction-images", first) : null,
            sort_order: Number(it.sort_order ?? 0),
          };
        })
        .filter(Boolean) as CollectionAuctionBrief[];
      items.sort((x, y) => x.sort_order - y.sort_order || x.title.localeCompare(y.title));
      const { seller_collection_items: _omit, ...rest } = row;
      return {
        ...mapCollectionRow(rest),
        items,
      } satisfies SellerCollectionDetail;
    },
  });
}

/** Collection ids that include this auction (visible to seller for drafts; public rows per RLS). */
export function useAuctionCollectionIds(auctionId: string | undefined) {
  return useQuery({
    queryKey: ["auction-collection-ids", auctionId],
    enabled: !!auctionId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("seller_collection_items")
        .select("collection_id")
        .eq("auction_id", auctionId as string);
      if (error) throw error;
      return [...new Set((data ?? []).map((r) => String((r as { collection_id: string }).collection_id)))];
    },
  });
}

/** Admin: search public collections by name for featured-article embeds. */
export function useAdminCollectionSearchForArticles(q: string, options?: { enabled?: boolean }) {
  const safe = q.replace(/%/g, "").trim();
  return useQuery({
    queryKey: ["admin", "collection-search-articles", safe],
    enabled: (options?.enabled ?? true) && safe.length >= 2,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("seller_collections")
        .select(collectionListSelect)
        .ilike("name", `%${safe}%`)
        .order("updated_at", { ascending: false })
        .limit(30);
      if (error) throw error;
      return (data ?? []).map((r) => mapCollectionRow(r as Record<string, unknown>));
    },
  });
}

/** Admin: manage featured collections for the Collections hub. */
export function useAdminCollectionsFeaturedList(options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: ["admin", "seller-collections-featured"],
    enabled: options?.enabled ?? true,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("seller_collections")
        .select(`${collectionListSelect}, profiles!seller_collections_seller_id_fkey ( display_name )`)
        .order("is_featured", { ascending: false })
        .order("featured_sort_order", { ascending: true, nullsFirst: false })
        .order("created_at", { ascending: false })
        .limit(200);
      if (error) throw error;
      return (data ?? []).map((r) => mapCollectionRow(r as Record<string, unknown>));
    },
  });
}

export function useInvalidateSellerCollections() {
  const qc = useQueryClient();
  return {
    invalidateAll: () => {
      void qc.invalidateQueries({ queryKey: ["seller-collections"] });
      void qc.invalidateQueries({ queryKey: ["seller-collection"] });
      void qc.invalidateQueries({ queryKey: ["auction-collection-ids"] });
    },
    invalidateCollection: (id: string) => {
      void qc.invalidateQueries({ queryKey: ["seller-collection", id] });
      void qc.invalidateQueries({ queryKey: ["seller-collections"] });
      void qc.invalidateQueries({ queryKey: ["auction-collection-ids"] });
    },
  };
}

export { sellerCollectionCoverPublicUrl };
