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
          auctions (
            id, title, description, status, ends_at, current_highest_bid, starting_price, seller_id, bid_count,
            auction_images ( storage_path, sort_order )
          )
        `,
        )
        .eq("bidder_id", auth.user.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []).map((row: Record<string, unknown>) => {
        const a = row.auctions as
          | (Record<string, unknown> & {
              auction_images?: { storage_path: string; sort_order: number }[];
            })
          | null;
        if (!a) return row;
        const imgs = [...(a.auction_images ?? [])].sort((x, y) => x.sort_order - y.sort_order);
        const first = imgs[0]?.storage_path;
        const { auction_images: _omit, ...auctionRest } = a;
        return {
          ...row,
          auctions: {
            ...auctionRest,
            image_url: first ? storagePublicUrl("auction-images", first) : null,
          },
        };
      });
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
          id, title, description, status, ends_at, created_at, current_highest_bid, starting_price, bid_count,
          bid_type, bid_number, communication_code, listing_fee_proof_path, listing_fee_paid,
          featured_listing_fee_pending,
          winner_id, winner_consent_given, winner_contact_phone, seller_phone, winner_position,
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
          id, title, status, payment_instructions, current_highest_bid, updated_at, ends_at,
          auction_images ( storage_path, sort_order )
        `,
        )
        .eq("winner_id", auth.user.id)
        .in("status", ["won", "paid", "completed", "awaiting_winner_consent", "payment_stage"])
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
          id, title, seller_id, created_at, starting_price, ends_at, bid_type, listing_fee_proof_path, status,
          auction_images ( storage_path, sort_order )
        `,
        )
        .eq("status", "pending_approval")
        .order("created_at", { ascending: true });
      if (error) throw error;
      const base = (data ?? []) as Record<string, unknown>[];
      const sellerIds = [...new Set(base.map((r) => String(r.seller_id ?? "")).filter(Boolean))];
      let nameById = new Map<string, string | null>();
      if (sellerIds.length) {
        const { data: profs, error: pe } = await supabase
          .from("profiles")
          .select("id, display_name")
          .in("id", sellerIds);
        if (pe) throw pe;
        nameById = new Map((profs ?? []).map((p) => [String(p.id), p.display_name ?? null]));
      }
      return base.map((row) => {
        const imgs = [
          ...((row.auction_images as { storage_path: string; sort_order: number }[]) ?? []),
        ].sort((a, b) => a.sort_order - b.sort_order);
        const first = imgs[0]?.storage_path;
        const sid = String(row.seller_id ?? "");
        return {
          ...row,
          image_url: first ? storagePublicUrl("auction-images", first) : null,
          seller_display_name: nameById.get(sid) ?? null,
        };
      });
    },
  });
}

export function useAwaitingPaymentAuctions(options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: ["admin-awaiting-payment"],
    enabled: options?.enabled ?? true,
    queryFn: async () => {
      const sel = `
          id, title, seller_id, created_at, starting_price, ends_at, bid_type, listing_fee_proof_path, status,
          featured_listing_fee_pending,
          auction_images ( storage_path, sort_order )
        `;
      const [awaiting, activePending] = await Promise.all([
        supabase.from("auctions").select(sel).eq("status", "awaiting_payment").order("created_at", {
          ascending: true,
        }),
        supabase
          .from("auctions")
          .select(sel)
          .eq("status", "active")
          .eq("featured_listing_fee_pending", true)
          .order("created_at", { ascending: true }),
      ]);
      if (awaiting.error) throw awaiting.error;
      if (activePending.error) throw activePending.error;
      const byId = new Map<string, Record<string, unknown>>();
      for (const row of [...(awaiting.data ?? []), ...(activePending.data ?? [])]) {
        byId.set(String((row as { id: string }).id), row as Record<string, unknown>);
      }
      const base = [...byId.values()];
      const sellerIds = [...new Set(base.map((r) => String(r.seller_id ?? "")).filter(Boolean))];
      let nameById = new Map<string, string | null>();
      if (sellerIds.length) {
        const { data: profs, error: pe } = await supabase
          .from("profiles")
          .select("id, display_name")
          .in("id", sellerIds);
        if (pe) throw pe;
        nameById = new Map((profs ?? []).map((p) => [String(p.id), p.display_name ?? null]));
      }
      return base.map((row) => {
        const imgs = [
          ...((row.auction_images as { storage_path: string; sort_order: number }[]) ?? []),
        ].sort((a, b) => a.sort_order - b.sort_order);
        const first = imgs[0]?.storage_path;
        const sid = String(row.seller_id ?? "");
        return {
          ...row,
          image_url: first ? storagePublicUrl("auction-images", first) : null,
          seller_display_name: nameById.get(sid) ?? null,
        };
      });
    },
  });
}

export function useAwaitingClosureAuctions(options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: ["admin-awaiting-closure"],
    enabled: options?.enabled ?? true,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("auctions")
        .select(
          `
          id, title, seller_id, created_at, status, winner_id, bid_number,
          auction_images ( storage_path, sort_order )
        `,
        )
        .eq("status", "payment_stage")
        .order("updated_at", { ascending: false });
      if (error) throw error;
      const base = (data ?? []) as Record<string, unknown>[];
      const sellerIds = [...new Set(base.map((r) => String(r.seller_id ?? "")).filter(Boolean))];
      let nameById = new Map<string, string | null>();
      if (sellerIds.length) {
        const { data: profs, error: pe } = await supabase
          .from("profiles")
          .select("id, display_name")
          .in("id", sellerIds);
        if (pe) throw pe;
        nameById = new Map((profs ?? []).map((p) => [String(p.id), p.display_name ?? null]));
      }
      return base.map((row) => {
        const imgs = [
          ...((row.auction_images as { storage_path: string; sort_order: number }[]) ?? []),
        ].sort((a, b) => a.sort_order - b.sort_order);
        const first = imgs[0]?.storage_path;
        const sid = String(row.seller_id ?? "");
        return {
          ...row,
          image_url: first ? storagePublicUrl("auction-images", first) : null,
          seller_display_name: nameById.get(sid) ?? null,
        };
      });
    },
  });
}

export function useAdminQueueCounts(options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: ["admin-queue-counts"],
    enabled: options?.enabled ?? false,
    queryFn: async () => {
      const [p1, p2a, p2b, p3] = await Promise.all([
        supabase
          .from("auctions")
          .select("id", { count: "exact", head: true })
          .eq("status", "pending_approval"),
        supabase
          .from("auctions")
          .select("id", { count: "exact", head: true })
          .eq("status", "awaiting_payment"),
        supabase
          .from("auctions")
          .select("id", { count: "exact", head: true })
          .eq("status", "active")
          .eq("featured_listing_fee_pending", true),
        supabase
          .from("auctions")
          .select("id", { count: "exact", head: true })
          .eq("status", "payment_stage"),
      ]);
      if (p1.error) throw p1.error;
      if (p2a.error) throw p2a.error;
      if (p2b.error) throw p2b.error;
      if (p3.error) throw p3.error;
      const awaitingPayment = (p2a.count ?? 0) + (p2b.count ?? 0);
      return {
        pendingApproval: p1.count ?? 0,
        awaitingPayment,
        awaitingClosure: p3.count ?? 0,
      };
    },
  });
}

export function useAdminUsers(options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: ["admin-users"],
    enabled: options?.enabled ?? false,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select(
          "id, display_name, phone, role, suspended_at, created_at, seller_verification_status, seller_applied_at",
        )
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useAdminProfileDetail(userId: string, enabled: boolean) {
  return useQuery({
    queryKey: ["admin-profile", userId],
    enabled: enabled && !!userId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select(
          "id, display_name, phone, role, suspended_at, created_at, seller_verification_status, seller_verification_note, seller_applied_at, seller_decided_at, account_type, contact_email, location_text",
        )
        .eq("id", userId)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });
}
