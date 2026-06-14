/** Stitch-style badge: `2d 14h` when ≥1 day left, else `HH:MM:SS` (duration hours may exceed 23 before first full day). */
export function formatAuctionBadgeCountdown(totalSec: number): string {
  if (totalSec <= 0) return "Ended";
  const d = Math.floor(totalSec / 86400);
  const h = Math.floor((totalSec % 86400) / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  const pad2 = (n: number) => n.toString().padStart(2, "0");
  if (d >= 1) {
    return `${d}d ${h}h`;
  }
  return `${pad2(h)}:${pad2(m)}:${pad2(s)}`;
}
