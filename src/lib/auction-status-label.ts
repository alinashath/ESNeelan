/** Human-readable labels for `public.auction_status` (DB + legacy). */
export function auctionStatusLabel(status: string | null | undefined): string {
  const s = String(status ?? "").trim();
  switch (s) {
    case "draft":
      return "Draft";
    case "pending_approval":
      return "Pending approval";
    case "awaiting_payment":
      return "Awaiting fee payment";
    case "active":
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
