/**
 * Web / large-screen layout — complements `tokens.ts` (8-point grid, 60/30/10).
 * Keeps readable line length on desktop while staying full-bleed on phones (mobile-app-ui-design).
 */
export const layout = {
  /** Centered column cap for web / tablet landscape */
  maxContentWidth: 1200,
  breakpoints: {
    /** Large phone / small tablet */
    md: 768,
    /** Tablet landscape / desktop */
    lg: 1024,
  },
} as const;

export type GridColumnCount = 2 | 3 | 4;

/** Catalog grids (home trending, Explore): more columns when there is room */
export function getTrendingGridColumns(width: number): GridColumnCount {
  if (width >= layout.breakpoints.lg) return 4;
  if (width >= layout.breakpoints.md) return 3;
  return 2;
}
