import { Platform, TextStyle } from "react-native";

/**
 * Harper’s Bazaar Editorial — monochrome fashion system.
 * Black primary ink/CTAs, serif story headlines, Helvetica-like body/UI.
 * See `docs/design-harpers-editorial.md`.
 */
export const palette = {
  /** Masthead, nav, buttons, body ink */
  primary: "#000000",
  /** Filled CTA */
  primaryCta: "#000000",
  primaryPressed: "#333333",
  primaryFocus: "#666666",
  primaryOnDark: "#ffffff",
  ink: "#000000",
  inkSoft: "#333333",
  body: "#444444",
  onSurface: "#000000",
  charcoal: "#333333",
  inkMuted80: "#666666",
  inkMuted48: "#666666",
  /** Supporting text */
  secondary: "#444444",
  /** Borders / dividers */
  hairline: "#E5E7EB",
  dividerSoft: "#E5E7EB",
  hairlineSoft: "#E5E7EB",
  canvas: "#ffffff",
  canvasParchment: "#ffffff",
  surfaceCard: "#F7F7F7",
  surfaceSoft: "#F7F7F7",
  surfaceBlush: "#F7F7F7",
  tertiaryInk: "#333333",
  tertiaryBadgeBg: "rgba(0, 0, 0, 0.06)",
  tertiaryBadgeBorder: "rgba(0, 0, 0, 0.16)",
  secondaryFixed: "#F7F7F7",
  secondaryContainer: "#F7F7F7",
  statsBarSurface: "#F7F7F7",
  surfacePearl: "#F7F7F7",
  surfaceTile1: "#000000",
  surfaceTile2: "#333333",
  surfaceTile3: "#444444",
  surfaceBlack: "#000000",
  surfaceChipTranslucent: "#E5E7EB",
  onPrimary: "#ffffff",
  onDark: "#ffffff",
  neutral: "#ffffff",
  primaryDeep: "#333333",
  surface: "#ffffff",
  surfaceRaised: "#ffffff",
  successGreen: "#2ECC8A",
  alertRed: "#B00020",
  ivory: "#ffffff",
  ivoryMuted: "rgba(255,255,255,0.88)",
  obsidian: "#000000",
} as const;

export const accentBorderSubtle = "rgba(0, 0, 0, 0.2)";
export const accentBorderStrong = "rgba(0, 0, 0, 0.45)";
export const accentWash = "rgba(0, 0, 0, 0.06)";
export const accentWashDeep = "rgba(0, 0, 0, 0.1)";

export const goldBorderSubtle = accentBorderSubtle;
export const goldBorderStrong = accentBorderStrong;
export const goldWash = accentWash;
export const goldWashDeep = accentWashDeep;

export const colors = {
  primary: palette.primary,
  /** Filled CTA, featured badge, tab FAB fill */
  accent: palette.primaryCta,
  accentPressed: palette.primaryPressed,
  background: palette.surfaceCard,
  surfaceMuted: palette.surfaceCard,
  statsBarSurface: palette.statsBarSurface,
  searchBarFill: palette.surface,
  /** Icon wells */
  secondaryContainer: palette.secondaryContainer,
  chipIdle: palette.secondaryFixed,
  hairlineSoft: palette.hairlineSoft,
  accentTint: accentWash,
  surfaceStats: palette.surfaceCard,
  accentMuted: accentWash,
  surfaceSoft: palette.surfaceSoft,
  surfaceBlush: palette.surfaceBlush,
  surfaceCard: palette.surfaceCard,
  tertiaryMuted: "rgba(0, 0, 0, 0.04)",
  text: palette.onSurface,
  textSecondary: palette.secondary,
  textMuted: palette.inkMuted48,
  border: palette.hairline,
  secondary: palette.successGreen,
  tertiary: palette.ink,
  danger: palette.alertRed,
  warning: palette.alertRed,
  white: palette.neutral,
  onAccent: palette.onPrimary,
  obsidian: palette.obsidian,
  ivory: palette.ivory,
  ivoryMuted: palette.ivoryMuted,
  gold: palette.primaryCta,
  success: palette.successGreen,
  linkOnDark: palette.primaryOnDark,
  navBar: palette.canvas,
  chromeOnImage: "#FFFFFF",
  verifiedBadgeText: palette.tertiaryInk,
  verifiedBadgeBg: palette.tertiaryBadgeBg,
  verifiedBadgeBorder: palette.tertiaryBadgeBorder,
} as const;

const accentRingShadow = {
  shadowColor: "#000000",
  shadowOffset: { width: 0, height: 0 },
  shadowOpacity: 0.16,
  shadowRadius: 0,
  elevation: 0,
} as const;

/** Flat / print-like — borders over shadows */
export const shadows = {
  card: {
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0,
    shadowRadius: 0,
    elevation: 0,
  },
  productImage: {
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 1,
  },
  tabFab: {
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 4,
  },
  accentRing: accentRingShadow,
  goldRing: accentRingShadow,
} as const;

/** Design scale: 4 / 8 / 16 / 20 / 24 / 32 / 48 */
export const appleSpacing = {
  xxs: 4,
  xs: 8,
  sm: 12,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
  section: 48,
  gutter: 32,
} as const;

export const buttonPrimaryPadding = {
  paddingVertical: 8,
  paddingHorizontal: 16,
  minHeight: 40,
} as const;

export const space = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 16,
  xl: 24,
  xxl: 32,
  xxxl: 48,
  sectionX: appleSpacing.gutter,
} as const;

/** Editorial: 4px controls, 8px cards, 12–16px larger modules, pills for chips only */
export const radii = {
  none: 0,
  xs: 4,
  sm: 4,
  md: 8,
  xl: 16,
  lg: 12,
  pill: 9999,
} as const;

/**
 * NewParis Text substitute — editorial serif for story / product headlines.
 * Helvetica Now Text substitute — system Helvetica stack on web; Inter on native.
 */
const HEADING_SERIF: string =
  Platform.OS === "web"
    ? '"Libre Baskerville", "Iowan Old Style", "Palatino Linotype", Palatino, Georgia, "Times New Roman", serif'
    : Platform.OS === "ios"
      ? "Georgia"
      : "serif";

const BODY_SANS: string =
  Platform.OS === "web"
    ? '"Helvetica Neue", Helvetica, Arial, sans-serif'
    : "Inter_400Regular";

const BODY_SANS_MEDIUM: string =
  Platform.OS === "web"
    ? '"Helvetica Neue", Helvetica, Arial, sans-serif'
    : "Inter_500Medium";

const BODY_SANS_SEMIBOLD: string =
  Platform.OS === "web"
    ? '"Helvetica Neue", Helvetica, Arial, sans-serif'
    : "Inter_600SemiBold";

const UI_SANS: string =
  Platform.OS === "web"
    ? '"Helvetica Neue", Helvetica, Arial, sans-serif'
    : "Inter_400Regular";

export const fontFamilies = {
  displayRegular: BODY_SANS,
  displayMedium: BODY_SANS_MEDIUM,
  displaySemiBold: BODY_SANS_SEMIBOLD,
  displayBold: BODY_SANS_SEMIBOLD,
  /** Story / lot titles — NewParis Text role */
  headingSerif: HEADING_SERIF,
  body: BODY_SANS,
  bodyMedium: BODY_SANS_MEDIUM,
  bodySemiBold: BODY_SANS_SEMIBOLD,
  bodyBold: BODY_SANS_SEMIBOLD,
  ui: UI_SANS,
} as const;

export const fontMono = fontFamilies.bodySemiBold;

export const typography = {
  /** headline-display — hero / masthead (sans, assertive) */
  display: {
    fontSize: 36,
    lineHeight: 43,
    fontWeight: "700" as TextStyle["fontWeight"],
    color: palette.ink,
    letterSpacing: 0,
    fontFamily: fontFamilies.ui,
  },
  /** headline-lg — editorial story title */
  title: {
    fontSize: 31,
    lineHeight: 43,
    fontWeight: "400" as TextStyle["fontWeight"],
    color: palette.ink,
    letterSpacing: 0,
    fontFamily: fontFamilies.headingSerif,
  },
  /** headline-md */
  section: {
    fontSize: 27,
    lineHeight: 28,
    fontWeight: "400" as TextStyle["fontWeight"],
    color: palette.ink,
    letterSpacing: 0.2,
    fontFamily: fontFamilies.headingSerif,
  },
  /** headline-sm scale with serif for lot / card titles */
  cardTitle: {
    fontSize: 23,
    lineHeight: 28,
    fontWeight: "400" as TextStyle["fontWeight"],
    color: palette.onSurface,
    letterSpacing: 0,
    fontFamily: fontFamilies.headingSerif,
  },
  /** body-md */
  body: {
    fontSize: 16,
    lineHeight: 24,
    fontWeight: "400" as TextStyle["fontWeight"],
    color: palette.body,
    letterSpacing: 0,
    fontFamily: fontFamilies.body,
  },
  /** body-sm / label-md utility */
  caption: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: "400" as TextStyle["fontWeight"],
    color: palette.inkMuted48,
    letterSpacing: 0,
    fontFamily: fontFamilies.body,
  },
  /** label-sm */
  label: {
    fontSize: 12,
    lineHeight: 16,
    fontWeight: "400" as TextStyle["fontWeight"],
    color: palette.inkMuted80,
    letterSpacing: 0,
    fontFamily: fontFamilies.ui,
  },
} as const;
