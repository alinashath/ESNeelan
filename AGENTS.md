# Expo HAS CHANGED

Read the exact versioned docs at https://docs.expo.dev/versions/v56.0.0/ before writing any code.

## ES Neelan UI

**Default app theme is light — Apple Clean** (`src/theme/tokens.ts`: `#F5F5F7` canvas, white cards, `#1D1D1F` ink, `#0071E3` primary).

Use **`BIDMASTER_DESIGN.md`** for brand, typography roles, spacing, radii, and patterns. Legacy HTML mock **`bidmaster_luxury_redesign.html`** is not the canonical palette; prefer tokens + design md.

- **Tokens:** colors, type, radii, and spacing live in `src/theme/tokens.ts` (not Tailwind). Prefer `palette` / `accentBorderSubtle`; `goldBorderSubtle` is a deprecated alias (blue tint). Keep semantic `colors.*` stable.
- **Typography:** **Inter** at Apple-like scale (display through label); **all prices** in Inter at **600 max** (semibold) — same family as UI.
- **Principles:** Apple blue for primary actions; minimal shadow; thin `colors.border` dividers; sufficient contrast on `colors.background` / `colors.surfaceMuted`.

## Mobile UI / UX

For layout, hierarchy, motion, empty states, and touch targets, also follow:

`~/.agents/skills/mobile-app-ui-design/SKILL.md`

Prefer `Ionicons` over Lucide in this repo.
