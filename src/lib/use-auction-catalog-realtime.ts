import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef } from "react";
import { supabase } from "@/src/lib/supabase";

const CHANNEL = "catalog-auctions-realtime";
const INVALIDATE_DEBOUNCE_MS = 200;

/**
 * Subscribes to `public.auctions` changes over Supabase Realtime (RLS applies).
 * Invalidates React Query `["auctions", …]` lists and category explore counts so
 * home / explore / storefront / category index stay fresh — no polling interval.
 */
export function useAuctionCatalogRealtimeSync() {
  const qc = useQueryClient();
  const qcRef = useRef(qc);
  qcRef.current = qc;
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    function scheduleInvalidate() {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => {
        debounceRef.current = null;
        void qcRef.current.invalidateQueries({ queryKey: ["auctions"] });
        void qcRef.current.invalidateQueries({ queryKey: ["categories", "explore-counts"] });
        void qcRef.current.invalidateQueries({ queryKey: ["sellers"] });
      }, INVALIDATE_DEBOUNCE_MS);
    }

    const channel = supabase
      .channel(CHANNEL)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "auctions" },
        () => {
          scheduleInvalidate();
        },
      )
      .subscribe();

    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
        debounceRef.current = null;
      }
      void supabase.removeChannel(channel);
    };
  }, []);
}
