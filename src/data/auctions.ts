import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/src/lib/supabase";
import { storagePublicUrl } from "@/src/lib/storage-url";

export type AuctionListRow = {
  id: string;
  title: string;
  status: string;
  ends_at: string;
  starts_at: string;
  current_highest_bid: number | null;
  starting_price: number;
  bid_count: number;
  category_id: string | null;
  seller_id: string;
  image_path: string | null;
};

export function useActiveAuctions(filters?: {
  categoryId?: string | null;
  search?: string;
  minPrice?: number;
  maxPrice?: number;
}) {
  return useQuery({
    queryKey: ["auctions", "active", filters],
    queryFn: async () => {
      let q = supabase
        .from("auctions")
        .select(
          `
          id, title, status, ends_at, starts_at, current_highest_bid, starting_price, bid_count, category_id, seller_id,
          auction_images ( storage_path, sort_order )
        `,
        )
        .eq("status", "active")
        .order("created_at", { ascending: false });

      if (filters?.categoryId) {
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
          status: r.status,
          ends_at: r.ends_at,
          starts_at: r.starts_at,
          current_highest_bid: r.current_highest_bid,
          starting_price: Number(r.starting_price),
          bid_count: r.bid_count,
          category_id: r.category_id,
          seller_id: r.seller_id,
          image_url: first
            ? storagePublicUrl("auction-images", first)
            : null,
        };
      });
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
          categories ( name, slug ),
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
      return {
        ...(a as Record<string, unknown>),
        image_urls,
        seller,
      };
    },
  });
}

export function useCategories() {
  return useQuery({
    queryKey: ["categories"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("categories")
        .select("id, name, slug")
        .order("name");
      if (error) throw error;
      return data ?? [];
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
