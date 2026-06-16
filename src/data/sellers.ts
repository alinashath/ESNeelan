import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/src/lib/supabase";
import { getAvatarPublicUrl } from "@/src/lib/avatar";

export type RankedSellerRow = {
  id: string;
  display_name: string | null;
  avatar_url: string | null;
  active_listing_count: number;
};

/**
 * Sellers ranked by number of **active** live listings (ties: stable by seller id).
 * Used for home “Top sellers” and `/sellers` index.
 */
export function useSellersRankedByActiveListings(options?: { limit?: number }) {
  const limit = options?.limit;
  return useQuery({
    queryKey: ["sellers", "ranked-active", limit ?? "all"],
    queryFn: async () => {
      const { data: rows, error } = await supabase
        .from("auctions")
        .select("seller_id")
        .eq("status", "active");
      if (error) throw error;

      const counts = new Map<string, number>();
      for (const r of rows ?? []) {
        const sid = String((r as { seller_id: string }).seller_id);
        counts.set(sid, (counts.get(sid) ?? 0) + 1);
      }

      const sorted = [...counts.entries()].sort((a, b) => {
        if (b[1] !== a[1]) return b[1] - a[1];
        return a[0].localeCompare(b[0]);
      });
      const slice = limit != null ? sorted.slice(0, limit) : sorted;
      const ids = slice.map(([id]) => id);
      if (ids.length === 0) return [] as RankedSellerRow[];

      const { data: profs, error: pErr } = await supabase
        .from("profiles")
        .select("id, display_name, avatar_storage_path")
        .in("id", ids);
      if (pErr) throw pErr;

      const byId = new Map(
        (profs ?? []).map((p) => [
          p.id,
          p as { id: string; display_name: string | null; avatar_storage_path: string | null },
        ]),
      );

      return slice.map(([id, active_listing_count]) => {
        const p = byId.get(id);
        return {
          id,
          display_name: p?.display_name ?? null,
          avatar_url: getAvatarPublicUrl(p?.avatar_storage_path ?? null),
          active_listing_count,
        } satisfies RankedSellerRow;
      });
    },
  });
}
