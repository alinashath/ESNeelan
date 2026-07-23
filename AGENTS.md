# Expo HAS CHANGED

Read the exact versioned docs at https://docs.expo.dev/versions/v56.0.0/ before writing any code.

## ES Neelan UI

**Default theme** follows **Harper’s Bazaar Editorial** (see `docs/design-harpers-editorial.md`). Monochrome-first: black primary ink/CTAs, white surfaces, light gray structure. Logo mark: `assets/images/brand-icon.png`.

Use **`docs/design-harpers-editorial.md`** for product chrome, layout, and component recipes. **`docs/design-stitch-home.md`**, **`DESIGN-pinterest.md`**, **`BIDMASTER_DESIGN.md`**, and **`DESIGN-apple.md`** are historical references only.

- **Tokens:** `src/theme/tokens.ts` — editorial palette, tight radii, flat elevation; Helvetica-like sans for body/UI; **`headingSerif`** (Libre Baskerville / Georgia) for story and lot titles.
- **Typography:** sans for masthead/display, labels, nav, and body; **`headingSerif`** for `typography.title` / `section` / `cardTitle` and featured lot titles.
- **Principles:** black on white for primary CTAs and active emphasis; borders before shadows; success `#2ECC8A` and error `#B00020` only for auction / validation semantics.

### Design handoff

When implementing UI, prefer `docs/design-harpers-editorial.md` over older Stitch/Pinterest notes.

## Mobile UI / UX

For layout, hierarchy, motion, empty states, and touch targets, also follow:

`~/.agents/skills/mobile-app-ui-design/SKILL.md`

Prefer `Ionicons` over Lucide in this repo.
