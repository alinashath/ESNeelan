# Expo HAS CHANGED

Read the exact versioned docs at https://docs.expo.dev/versions/v56.0.0/ before writing any code.

## ES Neelan UI

**Default theme** follows the **Stitch** ES Neelan home handoff (see `docs/design-stitch-home.md`) and `DESIGN-pinterest.md` for motion/spacing vocabulary where useful. Brand ink **`#b7001a`** (`colors.primary`), CTA / featured fill **`#e60023`** (`colors.accent`).

Use **`docs/design-stitch-home.md`** + **`DESIGN-pinterest.md`** for product chrome, marketing layout, and spacing/motion vocabulary. **`BIDMASTER_DESIGN.md`** and **`DESIGN-apple.md`** are historical references only.

- **Tokens:** `src/theme/tokens.ts` — Stitch palette, radii, surfaces; **Inter** for body/UI; **`headingSerif`** for display-level type.
- **Typography:** **Inter** for body, captions, and controls; **`headingSerif`** (Georgia stack on web) for `typography.display` / `title` / `section` / `cardTitle` and featured lot titles — aligned with Stitch editorial.
- **Principles:** one saturated red on light surfaces for primary CTAs and active nav emphasis; **minimal shadow** on lists; success `#2ECC8A` and danger `#D92D20` for auction semantics.

### Stitch / Figma MCP

When Stitch MCP is unavailable, implement from `docs/design-stitch-home.md`, exported HTML, and `DESIGN-pinterest.md`.

## Mobile UI / UX

For layout, hierarchy, motion, empty states, and touch targets, also follow:

`~/.agents/skills/mobile-app-ui-design/SKILL.md`

Prefer `Ionicons` over Lucide in this repo.
