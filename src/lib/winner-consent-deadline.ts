/** Winner must give platform consent within this window or the seller may skip them. */
export const WINNER_CONSENT_DEADLINE_HOURS = 48;
export const WINNER_CONSENT_DEADLINE_MS = WINNER_CONSENT_DEADLINE_HOURS * 60 * 60 * 1000;

export function winnerConsentDeadlineAt(requestedAt: string | null | undefined): Date | null {
  if (requestedAt == null) return null;
  const raw = String(requestedAt).trim();
  if (!raw) return null;
  const start = new Date(raw).getTime();
  if (Number.isNaN(start)) return null;
  return new Date(start + WINNER_CONSENT_DEADLINE_MS);
}

export function isWinnerConsentDeadlinePassed(requestedAt: string | null | undefined): boolean {
  const deadline = winnerConsentDeadlineAt(requestedAt);
  if (!deadline) return false;
  return Date.now() >= deadline.getTime();
}

export function winnerConsentTimeRemainingMs(requestedAt: string | null | undefined): number {
  const deadline = winnerConsentDeadlineAt(requestedAt);
  if (!deadline) return WINNER_CONSENT_DEADLINE_MS;
  return Math.max(0, deadline.getTime() - Date.now());
}

export function formatWinnerConsentCountdown(remainingMs: number): string {
  if (remainingMs <= 0) return "Deadline passed";
  const totalMinutes = Math.ceil(remainingMs / 60_000);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (hours >= 24) {
    const days = Math.floor(hours / 24);
    const remHours = hours % 24;
    return remHours > 0 ? `${days}d ${remHours}h` : `${days}d`;
  }
  if (hours > 0) return minutes > 0 ? `${hours}h ${minutes}m` : `${hours}h`;
  return `${minutes}m`;
}
