/**
 * True while the scheduled end is still in the future.
 * Callers should combine with `status === "active"` for open bidding.
 * Missing or invalid `ends_at` is treated as **not** open (avoids false “Live”).
 */
export function isBiddingWindowStillOpen(endsAt: string | null | undefined): boolean {
  if (endsAt == null) return false;
  const raw = String(endsAt).trim();
  if (!raw) return false;
  const t = new Date(raw).getTime();
  if (Number.isNaN(t)) return false;
  return t > Date.now();
}

/**
 * Human-readable labels for `public.auction_status` (DB + legacy).
 * Pass `ends_at` when `status` may be `active` so past-end lots show **Closed**, not Live.
 */
export function auctionStatusLabel(
  status: string | null | undefined,
  endsAt?: string | null | undefined,
): string {
  const s = String(status ?? "").trim();
  switch (s) {
    case "draft":
      return "Draft";
    case "pending_approval":
      return "Pending approval";
    case "awaiting_payment":
      return "Awaiting fee payment";
    case "active":
      if (!isBiddingWindowStillOpen(endsAt)) return "Closed";
      return "Live";
    case "awaiting_winner_consent":
      return "Awaiting winner";
    case "payment_stage":
      return "Payment stage";
    case "won":
      return "Payment stage";
    case "paid":
      return "Completed";
    case "completed":
      return "Completed";
    case "cancelled":
      return "Cancelled";
    case "ended":
      return "Ended (no bids)";
    default:
      return s || "Unknown";
  }
}
