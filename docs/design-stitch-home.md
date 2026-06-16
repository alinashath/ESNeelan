# Stitch — ES Neelan home (reference)

Design source: **Stitch** export *“ES Neelan | Modern Auction Platform”* (HTML + Tailwind config). Tokens in `src/theme/tokens.ts` map the key roles:

| Stitch token | Role | App mapping |
| --- | --- | --- |
| `primary` `#b7001a` | Nav active, prices, logo tile, links | `colors.primary` |
| `primary-container` `#e60023` | Sign up, featured ribbon, filled CTAs | `colors.accent` |
| `secondary-fixed` `#e3e3de` | Category chips (idle) | `colors.chipIdle` |
| `secondary-container` `#e0e0db` | Search field fill, icon wells | `colors.searchBarFill` |
| `surface-card` `#f6f6f3` | Page base | `colors.background` |
| `canvas` `#ffffff` | Header / footer | `colors.navBar` |

Typography in the export uses **Plus Jakarta Sans**; the app uses **Inter** for UI/body and **`fontFamilies.headingSerif`** (Georgia stack on web, Georgia / `serif` on native) for `typography.display` / `title` / `section` / `cardTitle` and the brand wordmark. Web marketing footer: `HomeMarketingFooter.tsx`.

**Featured strip (web):** viewport ≥1024px → three equal columns; ≥768px → two; narrower → horizontal carousel. Only the **first** featured lot shows the top-right countdown pill (dark translucent). Cards use **4:5** image aspect and **32px** corners. **Category pills:** idle `chipIdle` fill, no stroke; **All** selected = ink fill + white label (`Chip` `appearance="outlined"`).
