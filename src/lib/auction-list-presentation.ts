import type { CategoryRow } from "@/src/data/category-utils";
import { listingAttributeChips } from "@/src/lib/listing-attributes-display";
import { parseListingAttributesJson } from "@/src/lib/listing-attribute-templates";
import { deliveryOptionLabel } from "@/src/lib/listing-delivery-options";
import { itemConditionLabel } from "@/src/lib/listing-item-condition";

export type AuctionListPresentation = {
  item_condition: string | null;
  item_condition_label: string;
  listing_detail_chip_labels: string[];
};

export function buildAuctionListPresentation(
  curated: CategoryRow[] | undefined,
  row: {
    category_id: string | null;
    item_condition?: string | null;
    delivery_options?: string[] | null;
    listing_attributes?: unknown;
  },
): AuctionListPresentation {
  const attrs = parseListingAttributesJson(row.listing_attributes);
  const catIds = row.category_id ? [row.category_id] : [];
  const attrLabels = listingAttributeChips(curated ?? [], row.category_id, catIds, attrs).map(
    (c) => c.label,
  );
  const deliveryLabels = (row.delivery_options ?? [])
    .filter((x): x is string => typeof x === "string" && x.length > 0)
    .map((id) => deliveryOptionLabel(id));
  const merged = [...attrLabels.slice(0, 5), ...deliveryLabels.slice(0, 2)];
  return {
    item_condition: row.item_condition ?? null,
    item_condition_label: itemConditionLabel(row.item_condition),
    listing_detail_chip_labels: merged,
  };
}
