/**
 * Human-readable time left for auction detail ("ENDS IN …").
 * Always includes minutes when any full day or hour remains; under 1 hour, shows minutes + seconds.
 */
export function formatAuctionCountdownDetailed(totalSec: number): string {
  if (totalSec <= 0) return "Ended";
  const d = Math.floor(totalSec / 86400);
  const h = Math.floor((totalSec % 86400) / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;

  const dayPart = d === 0 ? "" : d === 1 ? "1 day" : `${d} days`;
  const hrPart = h === 0 ? "" : h === 1 ? "1 hr" : `${h} hrs`;
  const minPart = m === 1 ? "1 minute" : `${m} minutes`;
  const secPart = s === 1 ? "1 second" : `${s} seconds`;

  if (d > 0 || h > 0) {
    const parts: string[] = [];
    if (dayPart) parts.push(dayPart);
    if (hrPart) parts.push(hrPart);
    if (m > 0) {
      parts.push(minPart);
    } else if (s > 0) {
      parts.push(secPart);
    }
    return parts.join(" ");
  }
  if (m > 0) {
    return s > 0 ? `${minPart} ${secPart}` : minPart;
  }
  return secPart;
}

/**
 * Compact countdown for overlays (cards, carousel) — includes minutes when ≥ 1 day; ticks every second.
 */
export function formatAuctionBadgeCountdown(totalSec: number): string {
  if (totalSec <= 0) return "Ended";
  const d = Math.floor(totalSec / 86400);
  const h = Math.floor((totalSec % 86400) / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  if (d >= 1) return `${d}d ${h}h ${m}m`;
  if (h >= 1) return `${h}h ${m}m ${s}s`;
  if (m >= 1) return `${m}m ${s}s`;
  return `${s}s`;
}

/**
 * Auction sheet “ENDS IN” stat — reference `1d 0h` when ≥1 day; else `HH:MM:SS`.
 */
export function formatAuctionHeaderCountdown(totalSec: number): string {
  if (totalSec <= 0) return "Ended";
  const d = Math.floor(totalSec / 86400);
  const h = Math.floor((totalSec % 86400) / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  const pad2 = (n: number) => n.toString().padStart(2, "0");
  if (d >= 1) return `${d}d ${h}h`;
  return `${pad2(h)}:${pad2(m)}:${pad2(s)}`;
}
