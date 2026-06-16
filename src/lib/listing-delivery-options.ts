export type DeliveryOptionId =
  | "seller_delivery"
  | "seller_delivery_free"
  | "buyer_pickup"
  | "meetup_public";

export const DELIVERY_OPTIONS: { id: DeliveryOptionId; label: string; hint?: string }[] = [
  { id: "seller_delivery", label: "Seller delivery", hint: "Seller arranges delivery; buyer may pay shipping." },
  { id: "seller_delivery_free", label: "Seller free delivery", hint: "Delivery included at seller’s offer." },
  { id: "buyer_pickup", label: "Buyer pickup", hint: "Buyer collects from an agreed place." },
  { id: "meetup_public", label: "Meet at agreed location", hint: "Handoff at a mutually agreed safe public spot." },
];

export function isDeliveryOptionId(v: string): v is DeliveryOptionId {
  return DELIVERY_OPTIONS.some((o) => o.id === v);
}

export function deliveryOptionLabel(id: string): string {
  return DELIVERY_OPTIONS.find((o) => o.id === id)?.label ?? id;
}
