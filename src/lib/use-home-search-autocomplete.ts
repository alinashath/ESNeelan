import { useMemo } from "react";
import {
  useActiveAuctions,
  useActiveCategoryRoots,
  useCuratedCategories,
} from "@/src/data/auctions";
import { buildHomeSearchAutocompleteCandidates } from "@/src/lib/home-search-suggestions";

const CANDIDATE_CAP = 56;

/**
 * Shared pool for home catalog search autocomplete (active listings + curated roots).
 */
export function useHomeSearchAutocompleteCandidates(): readonly string[] {
  const { data: curated } = useCuratedCategories();
  const { data: activeRoots } = useActiveCategoryRoots(curated);
  const roots = activeRoots ?? [];
  const discoveryFilters = useMemo(
    () => ({ curatedCategories: curated }),
    [curated],
  );
  const { data: discoveryAuctions } = useActiveAuctions(discoveryFilters);

  return useMemo(
    () =>
      buildHomeSearchAutocompleteCandidates(
        discoveryAuctions ?? [],
        curated,
        roots,
        CANDIDATE_CAP,
      ),
    [discoveryAuctions, curated, roots],
  );
}
