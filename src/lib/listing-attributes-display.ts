import type { ListingAttributesV1 } from "@/src/lib/listing-attribute-templates";
import {
  formatColorTagForDisplay,
  formatDimensionCm,
  formatMaterialTagForDisplay,
  resolveListingFieldTemplate,
} from "@/src/lib/listing-attribute-templates";
import type { CategoryRow } from "@/src/data/category-utils";

export type ListingDetailChip = { key: string; label: string };

/** Rows of label + value chips for auction detail and list previews. */
export function listingAttributeChips(
  categories: CategoryRow[] | undefined,
  primaryCategoryId: string | null,
  listingCategoryIds: string[] | undefined,
  attrs: ListingAttributesV1 | null | undefined,
): ListingDetailChip[] {
  const ids =
    listingCategoryIds?.length ? listingCategoryIds : primaryCategoryId ? [primaryCategoryId] : [];
  const tpl = resolveListingFieldTemplate(categories ?? [], ids);
  const a = attrs ?? {};
  const chips: ListingDetailChip[] = [];

  if (tpl.showDimensions) {
    const w = formatDimensionCm(a.widthCm ?? undefined);
    const h = formatDimensionCm(a.heightCm ?? undefined);
    const d = formatDimensionCm(a.depthCm ?? undefined);
    if (w && h) chips.push({ key: "dim", label: `${w} × ${h}${d ? ` × ${d}` : ""}` });
    else {
      if (w) chips.push({ key: "w", label: `W ${w}` });
      if (h) chips.push({ key: "h", label: `H ${h}` });
      if (tpl.dimensionsDepth && d) chips.push({ key: "d", label: `D ${d}` });
    }
  }

  if (tpl.showApparelSize && a.sizeLabel) {
    chips.push({ key: "size", label: `Size ${a.sizeLabel}` });
  }

  if (tpl.showWeight && a.weightKg != null && Number.isFinite(a.weightKg)) {
    chips.push({ key: "wt", label: `${a.weightKg} kg` });
  }

  for (const c of a.colorTags ?? []) {
    const t = c.trim();
    if (t) chips.push({ key: `c-${t}`, label: formatColorTagForDisplay(t) });
  }
  for (const m of a.materialTags ?? []) {
    const t = m.trim();
    if (t) chips.push({ key: `m-${t}`, label: formatMaterialTagForDisplay(t) });
  }

  return chips;
}
