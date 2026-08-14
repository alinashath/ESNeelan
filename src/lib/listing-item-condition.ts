export type ItemConditionId =
  | "new"
  | "like_new"
  | "used_excellent"
  | "used_good"
  | "used_fair"
  | "for_parts";

export const ITEM_CONDITION_OPTIONS: { id: ItemConditionId; label: string }[] = [
  { id: "new", label: "New" },
  { id: "like_new", label: "Pre-owned" },
  { id: "used_excellent", label: "Pre-owned — excellent" },
  { id: "used_good", label: "Pre-owned — good" },
  { id: "used_fair", label: "Pre-owned — fair" },
  { id: "for_parts", label: "For parts / not working" },
];

export function isItemConditionId(v: string): v is ItemConditionId {
  return ITEM_CONDITION_OPTIONS.some((o) => o.id === v);
}

export function itemConditionLabel(id: string | null | undefined): string {
  if (!id) return "";
  const normalized = id.trim().toLowerCase().replace(/[\s-]+/g, "_");
  const aliases: Record<string, ItemConditionId> = {
    like_new: "like_new",
    used_like_new: "like_new",
    excellent: "used_excellent",
    good: "used_good",
    fair: "used_fair",
    parts: "for_parts",
  };
  const resolved = aliases[normalized] ?? normalized;
  const f = ITEM_CONDITION_OPTIONS.find((o) => o.id === resolved);
  if (f) return f.label;

  return normalized
    .split("_")
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}
