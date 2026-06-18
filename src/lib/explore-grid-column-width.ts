import { layout, getTrendingGridColumns } from "@/src/theme/layout";
import { space } from "@/src/theme/tokens";

/** Same column width math as the Explore catalog grid for a given content width. */
export function exploreGridColumnWidth(screenContentWidth: number): number {
  const gap = space.md;
  const numColumns = getTrendingGridColumns(screenContentWidth);
  const listInnerW = Math.max(0, screenContentWidth - space.lg * 4);
  return (listInnerW - gap * Math.max(0, numColumns - 1)) / Math.max(1, numColumns);
}

/**
 * Width for a single “Explore-style” listing card inside the article column
 * (capped by reading width and in-article horizontal padding).
 */
export function articleExploreEmbedCardWidth(screenContentWidth: number): number {
  const articleBench = Math.min(screenContentWidth, layout.articleReadingMaxWidth);
  const colW = exploreGridColumnWidth(articleBench);
  const inner = Math.max(120, articleBench - 2 * space.lg);
  return Math.max(120, Math.min(colW, inner));
}
