import type { CategoryRow } from "@/src/data/category-utils";

export type AuctionSuggestionSource = {
  title: string;
  category_id: string | null;
};

function rootIdForCategory(
  curated: CategoryRow[],
  categoryId: string | null,
): string | null {
  if (!categoryId) return null;
  const byId = new Map(curated.map((c) => [c.id, c]));
  let cur = byId.get(categoryId);
  if (!cur) return null;
  while (cur.parent_id) {
    const p = byId.get(cur.parent_id);
    if (!p) break;
    cur = p;
  }
  return cur.id;
}

function shortenTitle(title: string, maxLen = 28): string {
  const t = title.replace(/\s+/g, " ").trim();
  if (!t) return "";
  const first = t.split(/[,;]/)[0]?.trim() ?? t;
  if (first.length <= maxLen) return first;
  return `${first.slice(0, maxLen - 1).trimEnd()}…`;
}

/**
 * Category names + listing phrases for the home search autocomplete pool.
 */
export function buildHomeSearchAutocompleteCandidates(
  auctions: AuctionSuggestionSource[] | undefined,
  curated: CategoryRow[] | undefined,
  roots: Pick<CategoryRow, "id" | "name">[],
  max = 56,
): string[] {
  const out: string[] = [];
  const seen = new Set<string>();

  const add = (raw: string) => {
    const s = raw.trim();
    if (!s || seen.has(s.toLowerCase())) return;
    seen.add(s.toLowerCase());
    out.push(s);
  };

  if (!auctions?.length) {
    for (const r of roots) {
      add(r.name);
      if (out.length >= max) break;
    }
    return out;
  }

  if (curated?.length && roots.length) {
    const rootCounts = new Map<string, number>();
    for (const a of auctions) {
      const rid = rootIdForCategory(curated, a.category_id);
      if (rid) rootCounts.set(rid, (rootCounts.get(rid) ?? 0) + 1);
    }
    const byVolume = [...roots].sort(
      (a, b) => (rootCounts.get(b.id) ?? 0) - (rootCounts.get(a.id) ?? 0),
    );
    const topCats = Math.min(4, max);
    for (const r of byVolume) {
      if (out.length >= topCats) break;
      add(r.name);
    }
  }

  for (const a of auctions) {
    if (out.length >= max) break;
    add(shortenTitle(a.title));
  }

  return out.slice(0, max);
}

/**
 * Prefix matches first, then substring matches; deduped while preserving order.
 */
export function filterHomeSearchAutocompleteRows(
  candidates: readonly string[],
  query: string,
  limit: number,
): string[] {
  const q = query.trim().toLowerCase();
  if (!q) return Array.from(new Set(candidates)).slice(0, limit);

  const rows = candidates
    .map((c) => {
      const cl = c.toLowerCase();
      if (!cl.includes(q)) return null;
      return { c, starts: cl.startsWith(q), idx: cl.indexOf(q) };
    })
    .filter((x): x is NonNullable<typeof x> => x != null)
    .sort((a, b) => {
      if (a.starts !== b.starts) return a.starts ? -1 : 1;
      return a.idx - b.idx;
    })
    .map((x) => x.c);

  return [...new Set(rows)].slice(0, limit);
}
