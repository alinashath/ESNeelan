/**
 * Tunes cover URLs for display / OG (width, quality, format) where the host supports it.
 * Unsplash: https://unsplash.com/documentation#dynamically-resizable-images
 */
export function optimizeArticleCoverImageUrl(
  url: string | null | undefined,
  maxWidth: number,
): string | null {
  const raw = url?.trim();
  if (!raw) return null;
  try {
    if (raw.includes("images.unsplash.com")) {
      const u = new URL(raw);
      u.searchParams.set("w", String(Math.min(maxWidth, 1920)));
      u.searchParams.set("q", "82");
      u.searchParams.set("auto", "format");
      u.searchParams.set("fit", "crop");
      return u.toString();
    }
  } catch {
    /* ignore */
  }
  return raw;
}
