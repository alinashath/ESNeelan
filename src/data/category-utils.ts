export type CategoryRow = {
  id: string;
  name: string;
  slug: string;
  parent_id: string | null;
  sort_order: number;
  ecosystem: string;
};

export function categoryPathLabel(categories: CategoryRow[], id: string): string {
  const byId = new Map(categories.map((c) => [c.id, c]));
  const parts: string[] = [];
  let cur: CategoryRow | undefined = byId.get(id);
  const guard = new Set<string>();
  while (cur && !guard.has(cur.id)) {
    guard.add(cur.id);
    parts.unshift(cur.name);
    cur = cur.parent_id ? byId.get(cur.parent_id) : undefined;
  }
  return parts.join(" › ");
}

/** All category ids in subtree rooted at rootId (includes root). */
export function collectSubtreeIds(categories: CategoryRow[], rootId: string): string[] {
  const out = new Set<string>([rootId]);
  function walk(pid: string) {
    for (const c of categories) {
      if (c.parent_id === pid) {
        out.add(c.id);
        walk(c.id);
      }
    }
  }
  walk(rootId);
  return [...out];
}

export function filterCategoriesBySearch(categories: CategoryRow[], q: string): CategoryRow[] {
  const needle = q.trim().toLowerCase();
  if (!needle) return categories;
  return categories.filter((c) => {
    const path = categoryPathLabel(categories, c.id).toLowerCase();
    return path.includes(needle) || c.slug.toLowerCase().includes(needle);
  });
}
