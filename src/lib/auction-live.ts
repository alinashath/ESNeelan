import { auctionStatusLabel } from "@/src/lib/auction-status-label";

/**
 * True when the auction is open for bidding in the UI.
 * Rows can remain `status = active` briefly after `ends_at` until closure jobs run;
 * callers should use this instead of `status === "active"` for LIVE badges, countdowns, and bid CTAs.
 */
export function isAuctionLiveForUi(status: string, endsAt: string | null | undefined): boolean {
  if (String(status).trim() !== "active") return false;
  if (endsAt == null) return true;
  const raw = String(endsAt).trim();
  if (!raw) return true;
  const t = new Date(raw).getTime();
  if (Number.isNaN(t)) return true;
  return t > Date.now();
}

/** Status column on auction detail when not showing the live countdown. */
export function auctionDetailStatusText(status: string, endsAt: string | null | undefined): string {
  const s = String(status ?? "").trim();
  if (s === "active" && !isAuctionLiveForUi("active", endsAt)) {
    return "Bidding closed";
  }
  return auctionStatusLabel(status);
}
