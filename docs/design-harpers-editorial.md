# Harper’s Bazaar Editorial — ES Neelan

Design source: high-contrast fashion editorial system (luxury serif headlines + restrained sans utility). Tokens live in `src/theme/tokens.ts`.

## Overview

Polished magazine feel: bold, image-led, monochrome. Confident and premium rather than playful. Spacious at page level; dense in content modules. Depth from contrast and type scale — not shadows.

## Colors

| Token | Hex | Role |
| --- | --- | --- |
| `primary` / `accent` | `#000000` | Masthead, nav active, CTAs, body ink |
| `secondary` (text) | `#444444` | Supporting copy |
| `border` / tertiary | `#E5E7EB` | Hairlines, dividers |
| `surface` / nav | `#FFFFFF` | Canvas, cards |
| `background` / surface-weak | `#F7F7F7` | Page wash, chips, soft panels |
| `on-surface` | `#000000` | Default text on white |
| `danger` / error | `#B00020` | Validation / destructive |
| `success` | `#2ECC8A` | Auction win / positive status only |

## Typography

| Role | Face | Size / leading | Weight |
| --- | --- | --- | --- |
| `typography.display` (headline-display) | Sans (Helvetica-like) | 36 / 43 | 700 |
| `typography.title` (headline-lg) | Serif (`headingSerif`) | 31 / 43 | 400 |
| `typography.section` (headline-md) | Serif | 27 / 28 | 400 |
| `typography.cardTitle` | Serif | 23 / 28 | 400 |
| `typography.body` (body-md) | Helvetica-like / Inter | 16 / 24 | 400 |
| `typography.caption` (body-sm) | same | 14 / 20 | 400 |
| `typography.label` (label-sm) | Sans | 12 / 16 | 400 |

Web serif stack includes **Libre Baskerville** (loaded in `app/+html.tsx`) as a NewParis Text stand-in. Native uses Georgia / system serif.

## Layout & spacing

Scale: **4 / 8 / 16 / 20 / 24**, gutter **32**, section **48**. Wide editorial grid; hierarchy via imagery + type, not heavy chrome.

## Shapes

| Token | px | Use |
| --- | --- | --- |
| `radii.sm` | 4 | Buttons, inputs |
| `radii.md` | 8 | Cards |
| `radii.lg` | 12 | Larger modules |
| `radii.xl` | 16 | Occasional soft blocks |
| `radii.pill` | 9999 | Chips / status only |

## Components

- **Primary button:** black fill, white label, `label-md` (14), padding 8×16, height 40, radius 4.
- **Secondary button:** transparent, black border + text, same metrics.
- **Tertiary:** text-only, no border.
- **Card:** white, light border, ~16px padding, radius 8, no shadow.
- **Input / search:** white, subtle border, height 40, radius 4 — utilitarian, not pill-shaped.
- **Chip:** surface-weak fill, pill only when needed; selected = ink fill or black tint.

## Do’s and don’ts

- Do stay monochrome-first; reserve color for success/error semantics.
- Do use serif for story / lot titles; sans for UI, metadata, nav.
- Do prefer hairline borders over elevation.
- Don’t introduce brand red, gradients, neon accents, or playful shadows.
- Don’t over-round controls; avoid large radii except chips.
- Don’t replace serif headlines with a generic all-sans system.
