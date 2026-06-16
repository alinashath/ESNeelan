export type ItemConditionId =
  | "new"
  | "like_new"
  | "used_excellent"
  | "used_good"
  | "used_fair"
  | "for_parts";

export const ITEM_CONDITION_OPTIONS: { id: ItemConditionId; label: string }[] = [
  { id: "new", label: "New" },
  { id: "like_new", label: "Used — like new" },
  { id: "used_excellent", label: "Used — excellent" },
  { id: "used_good", label: "Used — good" },
  { id: "used_fair", label: "Used — fair" },
  { id: "for_parts", label: "For parts / not working" },
];

export function isItemConditionId(v: string): v is ItemConditionId {
  return ITEM_CONDITION_OPTIONS.some((o) => o.id === v);
}

export function itemConditionLabel(id: string | null | undefined): string {
  if (!id) return "";
  const f = ITEM_CONDITION_OPTIONS.find((o) => o.id === id);
  return f?.label ?? id;
}
