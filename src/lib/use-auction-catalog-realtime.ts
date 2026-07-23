import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef } from "react";
import { supabase } from "@/src/lib/supabase";

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

    // Unique topic avoids StrictMode remount reusing a subscribed channel instance
    // (cannot add postgres_changes after subscribe()).
    const topic = `catalog-auctions-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
    const channel = supabase
      .channel(topic)
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
