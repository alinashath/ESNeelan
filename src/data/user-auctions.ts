import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/src/lib/supabase";
import { storagePublicUrl } from "@/src/lib/storage-url";

export function useMyBids() {
  return useQuery({
    queryKey: ["my-bids"],
    queryFn: async () => {
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user) return [];
      const { data, error } = await supabase
        .from("bids")
        .select(
          `
          id, amount, created_at, auction_id,
          auctions ( id, title, status, ends_at, current_highest_bid, starting_price, seller_id, bid_count )
        `,
        )
        .eq("bidder_id", auth.user.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useMyAuctions() {
  return useQuery({
    queryKey: ["my-auctions"],
    queryFn: async () => {
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user) return [];
      const { data, error } = await supabase
        .from("auctions")
        .select(
          `
          id, title, status, ends_at, current_highest_bid, starting_price, bid_count,
          auction_images ( storage_path, sort_order )
        `,
        )
        .eq("seller_id", auth.user.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []).map((row: Record<string, unknown>) => {
        const imgs = [...((row.auction_images as { storage_path: string; sort_order: number }[]) ?? [])].sort(
          (a, b) => a.sort_order - b.sort_order,
        );
        const first = imgs[0]?.storage_path;
        return {
          ...row,
          image_url: first ? storagePublicUrl("auction-images", first) : null,
        };
      });
    },
  });
}

export function useWonAuctions() {
  return useQuery({
    queryKey: ["won-auctions"],
    queryFn: async () => {
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user) return [];
      const { data, error } = await supabase
        .from("auctions")
        .select(
          `
          id, title, status, payment_instructions, current_highest_bid,
          auction_images ( storage_path, sort_order )
        `,
        )
        .eq("winner_id", auth.user.id)
        .in("status", ["won", "paid", "completed"])
        .order("updated_at", { ascending: false });
      if (error) throw error;
      return (data ?? []).map((row: Record<string, unknown>) => {
        const imgs = [...((row.auction_images as { storage_path: string; sort_order: number }[]) ?? [])].sort(
          (a, b) => a.sort_order - b.sort_order,
        );
        const first = imgs[0]?.storage_path;
        return {
          ...row,
          image_url: first ? storagePublicUrl("auction-images", first) : null,
        };
      });
    },
  });
}

export function usePendingApprovals() {
  return useQuery({
    queryKey: ["admin-pending"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("auctions")
        .select(
          `
          id, title, seller_id, created_at, starting_price, ends_at,
          auction_images ( storage_path, sort_order )
        `,
        )
        .eq("status", "pending_approval")
        .order("created_at", { ascending: true });
      if (error) throw error;
      return (data ?? []).map((row: Record<string, unknown>) => {
        const imgs = [...((row.auction_images as { storage_path: string; sort_order: number }[]) ?? [])].sort(
          (a, b) => a.sort_order - b.sort_order,
        );
        const first = imgs[0]?.storage_path;
        return {
          ...row,
          image_url: first ? storagePublicUrl("auction-images", first) : null,
        };
      });
    },
  });
}

export function useAdminUsers() {
  return useQuery({
    queryKey: ["admin-users"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, display_name, phone, role, suspended_at, created_at")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });
}
