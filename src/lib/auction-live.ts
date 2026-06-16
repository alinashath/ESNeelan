import {
  auctionStatusLabel,
  isBiddingWindowStillOpen,
} from "@/src/lib/auction-status-label";

/**
 * True when the auction is open for bidding in the UI.
 * Rows can remain `status = active` briefly after `ends_at` until closure jobs run;
 * callers should use this instead of `status === "active"` for live badges, countdowns, and bid CTAs.
 */
export function isAuctionLiveForUi(status: string, endsAt: string | null | undefined): boolean {
  if (String(status).trim() !== "active") return false;
  return isBiddingWindowStillOpen(endsAt);
}

/** Status line on auction detail / lists — respects `ends_at` for `active`. */
export function auctionDetailStatusText(status: string, endsAt: string | null | undefined): string {
  return auctionStatusLabel(status, endsAt);
}
