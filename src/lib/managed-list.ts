/** Shared helpers for searchable / sortable admin & account lists. */

export type SortDir = "asc" | "desc";

export function textMatchesQuery(haystack: string, query: string): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  return haystack.toLowerCase().includes(q);
}

export function compareStringsCaseInsensitive(a: string, b: string, dir: SortDir): number {
  const cmp = a.localeCompare(b, undefined, { sensitivity: "base" });
  return dir === "asc" ? cmp : -cmp;
}

export function compareIsoDates(a: string, b: string, dir: SortDir): number {
  const ta = new Date(a || 0).getTime();
  const tb = new Date(b || 0).getTime();
  const cmp = ta === tb ? 0 : ta < tb ? -1 : 1;
  return dir === "asc" ? cmp : -cmp;
}
