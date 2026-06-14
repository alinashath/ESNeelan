import { TextStyle } from "react-native";

/**
 * ES Neelan — **Apple Clean** light system (see `BIDMASTER_DESIGN.md`).
 * Primary accent: Apple blue; typography: Inter (SF Pro–like scale on native; load Inter on all platforms).
 * Semantic keys (`colors.primary`, `colors.background`, …) stay stable for app code.
 * **Typography:** maximum font weight **600** (semibold); do not use 700/bold.
 */
export const palette = {
  /** Apple primary CTA */
  primary: "#0071E3",
  /** Hover / deeper blue */
  primaryDeep: "#0066CC",
  /** Near-black copy */
  ink: "#1D1D1F",
  neutral: "#FFFFFF",
  /** Section / page wash */
  canvas: "#F5F5F7",
  surface: "#FFFFFF",
  surfaceRaised: "#FFFFFF",
  inkMuted: "rgba(29,29,31,0.62)",
  inkFaint: "rgba(29,29,31,0.45)",
  hairline: "#E5E7EB",

  successGreen: "#2ECC8A",
  alertRed: "#D92D20",

  /** Hero / scrim: light text on photography */
  ivory: "#FFFFFF",
  ivoryMuted: "rgba(255,255,255,0.88)",
  obsidian: "#1D1D1F",
} as const;

/** Focus / selected ring — Apple primary at low alpha */
export const accentBorderSubtle = "rgba(0, 113, 227, 0.35)";
export const accentBorderStrong = "rgba(0, 113, 227, 0.55)";
export const accentWash = "rgba(0, 113, 227, 0.12)";
export const accentWashDeep = "rgba(0, 113, 227, 0.18)";

/** @deprecated Legacy name; same as `accentBorderSubtle` (blue, not gold). */
export const goldBorderSubtle = accentBorderSubtle;
/** @deprecated Legacy name; same as `accentBorderStrong`. */
export const goldBorderStrong = accentBorderStrong;
/** @deprecated Legacy name; same as `accentWash`. */
export const goldWash = accentWash;
/** @deprecated Legacy name; same as `accentWashDeep`. */
export const goldWashDeep = accentWashDeep;

export const colors = {
  primary: palette.primary,
  background: palette.canvas,
  surfaceMuted: palette.surface,
  accent: palette.primary,
  accentTint: accentWash,
  surfaceStats: palette.surfaceRaised,
  accentMuted: accentWash,
  tertiaryMuted: "rgba(29,29,31,0.06)",
  text: palette.ink,
  textSecondary: palette.inkMuted,
  textMuted: palette.inkFaint,
  border: palette.hairline,
  secondary: palette.successGreen,
  tertiary: palette.ink,
  danger: palette.alertRed,
  warning: palette.alertRed,
  white: palette.neutral,
  onAccent: palette.neutral,
  obsidian: palette.obsidian,
  ivory: palette.ivory,
  /** Historical token; maps to primary blue for accent bars / rarity. */
  gold: palette.primary,
  success: palette.successGreen,
  navBar: palette.surface,
  chromeOnImage: "#FFFFFF",
} as const;

const accentRingShadow = {
  shadowColor: palette.primary,
  shadowOffset: { width: 0, height: 0 },
  shadowOpacity: 0.25,
  shadowRadius: 0,
  elevation: 0,
} as const;

export const shadows = {
  card: {
    shadowColor: "#1D1D1F",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  tabFab: {
    shadowColor: "#1D1D1F",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 8,
  },
  accentRing: accentRingShadow,
  /** @deprecated Legacy key; same as `accentRing`. */
  goldRing: accentRingShadow,
} as const;

/**
 * Literal **Apple Clean** spacing from the design spec (hero / marketing / web).
 * Prefer `space` for dense mobile screens; use this for section rhythm and docs parity.
 */
export const appleSpacing = {
  xs: 8,
  sm: 16,
  md: 24,
  lg: 44,
  xl: 70,
  gutter: 24,
  section: 70,
} as const;

/** Primary CTA padding (Apple `button-primary` spec). */
export const buttonPrimaryPadding = {
  paddingVertical: 11,
  paddingHorizontal: 21,
  minHeight: 44,
} as const;

/** App layout spacing — mobile-friendly; not every screen uses Apple’s 44/70px steps. */
export const space = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
  xxxl: 32,
  sectionX: appleSpacing.gutter,
} as const;

/** Apple radii: sm 4, md 8, lg 16; controls use pill */
export const radii = {
  none: 0,
  xs: 4,
  sm: 4,
  md: 8,
  lg: 16,
  pill: 999,
} as const;

export const fontFamilies = {
  displayRegular: "Inter_400Regular",
  displayMedium: "Inter_500Medium",
  displaySemiBold: "Inter_600SemiBold",
  /** Strongest heading weight — semibold only (no bold/700 in the app). */
  displayBold: "Inter_600SemiBold",
  body: "Inter_400Regular",
  bodyMedium: "Inter_500Medium",
  bodySemiBold: "Inter_600SemiBold",
  bodyBold: "Inter_600SemiBold",
} as const;

export const fontMono = fontFamilies.bodySemiBold;

export const typography = {
  display: {
    fontSize: 34,
    lineHeight: 40,
    fontWeight: "600" as TextStyle["fontWeight"],
    color: colors.text,
    letterSpacing: -0.2,
    fontFamily: fontFamilies.displaySemiBold,
  },
  title: {
    fontSize: 24,
    lineHeight: 32,
    fontWeight: "600" as TextStyle["fontWeight"],
    color: colors.text,
    fontFamily: fontFamilies.displaySemiBold,
  },
  section: {
    fontSize: 20,
    lineHeight: 28,
    fontWeight: "600" as TextStyle["fontWeight"],
    color: colors.text,
    fontFamily: fontFamilies.bodySemiBold,
  },
  cardTitle: {
    fontSize: 17,
    lineHeight: 24,
    fontWeight: "600" as TextStyle["fontWeight"],
    color: colors.text,
    fontFamily: fontFamilies.bodySemiBold,
  },
  body: {
    fontSize: 17,
    lineHeight: 26,
    fontWeight: "400" as TextStyle["fontWeight"],
    color: colors.textSecondary,
    fontFamily: fontFamilies.body,
  },
  caption: {
    fontSize: 15,
    lineHeight: 22,
    fontWeight: "400" as TextStyle["fontWeight"],
    color: colors.textMuted,
    fontFamily: fontFamilies.body,
  },
  label: {
    fontSize: 12,
    lineHeight: 16,
    fontWeight: "500" as TextStyle["fontWeight"],
    color: colors.primary,
    letterSpacing: 0.24,
    fontFamily: fontFamilies.bodyMedium,
  },
} as const;
