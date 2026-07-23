/**
 * Maldivian rufiyaa — MMA Currency Symbol Guideline:
 * https://www.mma.gov.mv/files/currency/Currency%20Symbol%20Guideline.pdf
 * Symbol always sits to the left of the numeric figure.
 *
 * UI should prefer {@link RufiyaaSign} (SVG from Wikimedia / MMA mark).
 * Text fallback uses official Unicode U+20C2 RUFIYAA SIGN (Unicode 18).
 * Plain Thaana U+0783 is NOT the currency symbol (missing the equals stroke).
 */
export const MVR_SIGN = "\u20C2";

/** ISO 4217 code — prefer {@link MVR_SIGN} / SVG in user-facing copy. */
export const MVR_CODE = "MVR";

/** Standard money string for UI: always two fraction digits. */
export function formatMoneyAmount(amount: number): string {
  return new Intl.NumberFormat(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

/** Rufiyaa sign before amount (MMA: symbol left of figure), e.g. `⃂ 1,250.00`. */
export function formatMoneyWithSign(amount: number): string {
  return `${MVR_SIGN} ${formatMoneyAmount(amount)}`;
}
