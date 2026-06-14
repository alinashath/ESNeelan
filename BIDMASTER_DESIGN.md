---
version: alpha
name: Apple Clean (ES Neelan)
description: A minimal, premium light-mode system with centered hero layouts, restrained color, and rounded call-to-action buttons — applied to ES Neelan’s auction experience.
---

# ES Neelan Design System

**AI & engineering reference** — aligned with `apple.com`-style *Apple Clean* tokens in `src/theme/tokens.ts`.

## Overview

ES Neelan uses a **quiet, high-polish consumer** surface: products and lots lead; UI stays secondary. The tone is premium, modern, and restrained, with breathing room and little decorative noise. Layouts feel **spacious and editorial**, not dense or transactional.

## Brand fit (auctions)

- **Trust first:** legible type, clear hierarchy, obvious primary actions.
- **Urgency without noise:** live and ending-soon states use **green** and **red** semantics; primary marketing CTAs stay **Apple blue** only where they are the single most important action.
- **Imagery forward:** hero and card photography is not boxed in heavy chrome; scrims use neutral dark gradients with **white** foreground type (`colors.ivory` / `chromeOnImage`).

## Colors

| Token | Hex | Usage |
|--------|-----|--------|
| **Primary** | `#0071E3` | Primary CTAs, links, key interactive emphasis (`colors.primary` / `colors.accent`) |
| **Secondary (deep blue)** | `#0066CC` | Hover / pressed emphasis, outlined controls (`palette.primaryDeep`) |
| **Ink** | `#1D1D1F` | Headlines, body, UI copy (`colors.text`) |
| **Neutral** | `#FFFFFF` | Cards, sheets, inputs on the main plane (`colors.surfaceMuted`, `colors.white`) |
| **Canvas / surface** | `#F5F5F7` | Page background, soft sections (`colors.background`) |
| **Hairline / muted** | `#E5E7EB` | Dividers, card borders (`colors.border`) |
| **Success** | `#2ECC8A` | Live, confirmed, reserve met (`colors.secondary` / `colors.success`) |
| **Danger** | `#D92D20` | Ending soon, outbid, validation errors (`colors.danger`) |

### Rules

- Use **`#0071E3`** only for the **most important** action on a surface so it stays distinctive.
- Prefer **thin borders** and **whitespace** over heavy shadows.
- Do not introduce extra accent hues that compete with lot imagery.

## Typography

**Spec:** SF Pro Display (large display) · SF Pro Text (UI, body). **App implementation:** **Inter** (Expo Google Fonts) at the same scale and weights for Android, iOS, and web.

| Role | Size / line | Weight | Family (app) |
|------|----------------|--------|----------------|
| Display / hero title | 34 / 40 | 600 | Inter SemiBold |
| Title | 24 / 32 | 600 | Inter SemiBold |
| Section | 20 / 28 | 600 | Inter SemiBold |
| Card title | 17 / 24 | 600 | Inter SemiBold |
| Body | 17 / 26 | 400 | Inter Regular |
| Caption | 15 / 22 | 400 | Inter Regular |
| Label | 12 / 16 | 500 | Inter Medium · **sentence case** (no forced all-caps) |

**Prices and bids:** use **Inter** at semibold (600) at most — same family as UI; never a display serif.

## Spacing

**Apple Clean (literal YAML)** — exported as `appleSpacing` in `tokens.ts`:

| Key | Value |
|-----|--------|
| xs | 8px |
| sm | 16px |
| md | 24px |
| lg | 44px |
| xl | 70px |
| gutter | 24px |
| section | 70px |

**App `space` scale** — tighter steps (`xs` 4 → `xxxl` 32) for cards, lists, and forms so mobile layouts stay dense; horizontal gutter aligns with Apple via `space.sectionX` (= 24).

Use **`buttonPrimaryPadding`** for primary/secondary pill buttons (44px min height, 11×21 padding).

## Radii

| Token | Value | Usage |
|--------|--------|--------|
| none | 0 | Flat strips, dividers |
| xs / sm | 4px | Cards (Apple card spec), small fields |
| md | 8px | Modals, larger fields |
| lg | 16px | Large panels (maps to marketing “lg”) |
| pill | 999px | Primary/secondary buttons, chips, pills |

Primary buttons: **pill** height target **44px**, horizontal padding **~21px** (see `ButtonPrimary` / product screens).

## Elevation & depth

Depth is **minimal**. Prefer **contrast**, **whitespace**, and **1px `colors.border`** over stacked shadows. If shadow is used, keep it **neutral** and soft (`shadows.card` in tokens).

## Components (ES Neelan mapping)

- **Primary button:** `colors.accent` background, `colors.onAccent` text, `radii.pill`.
- **Secondary / outline:** transparent or `colors.background` fill, `palette.primaryDeep` text and/or `accentBorderSubtle` border.
- **Cards:** `colors.surfaceMuted` (white), `borderColor: colors.border`, small radius (`radii.sm` / `radii.md`).
- **Chips / tags:** soft `colors.background` fill, pill radius, label typography.
- **Featured / marketing ribbon:** may use `accentWash` background + `accentBorderSubtle` border (replaces legacy gold wash).
- **Live badge:** green tint + `colors.success`; pulse on the dot where appropriate.
- **Ending soon:** `colors.danger` for countdown and badge — rare and distinct.

## Layout

Centered or **narrow readable column** for messaging on web; native stacks stay **full width** with `space.sectionX` gutters. Hero zones are **tall** with **large imagery**; supporting copy sits in a clear column under the title.

## Do’s and don’ts

**Do:** open layouts, crisp neutral type, one strong blue CTA per view when possible, thin borders, sentence-case labels.

**Don’t:** rainbow accents, heavy gradients, decorative chrome, all-caps label walls, solid gold-era borders — legacy `goldBorderSubtle` in code is a **blue** tint alias for compatibility.

## Accessibility

- Maintain **4.5:1** contrast for body text (`colors.text` / `textSecondary` on white or `#F5F5F7`).
- Respect **`prefers-reduced-motion`** for pulses and large motion.
- Primary controls: clear **`accessibilityLabel`** (e.g. “Place bid on {title}”).
- Focus: visible ring using **`accentBorderStrong`** (or platform focus).

---

*Canonical implementation: `src/theme/tokens.ts`. Update this doc when token values change.*
