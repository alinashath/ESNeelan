import { Platform, TextStyle } from "react-native";

/**
 * AUC — brand red `#e60023` for primary ink, CTAs, and logo tile.
 * Headlines use `fontFamilies.headingSerif` (Georgia stack on web).
 */
export const palette = {
  /** Brand red — nav active, prices, links, logo */
  primary: "#e60023",
  /** Filled CTA, featured ribbon */
  primaryCta: "#e60023",
  primaryPressed: "#cc001f",
  primaryFocus: "#435ee5",
  primaryOnDark: "#ffffff",
  ink: "#000000",
  inkSoft: "#211922",
  body: "#33332e",
  /** Main on-surface ink from Stitch */
  onSurface: "#2a1615",
  charcoal: "#262622",
  inkMuted80: "#62625b",
  inkMuted48: "#91918c",
  /** Nav / secondary label */
  secondary: "#5d5f5b",
  hairline: "#dadad3",
  dividerSoft: "#e5e5e0",
  hairlineSoft: "#e5e5e0",
  canvas: "#ffffff",
  /** Page wash */
  canvasParchment: "#fff8f7",
  surfaceCard: "#f6f6f3",
  /** Auction detail / Stitch — stat cards, seller pill */
  surfaceSoft: "#fbfbf9",
  /** Warm container — listing codes, legal callouts */
  surfaceBlush: "#ffe9e7",
  /** Verified seller badge (Stitch tertiary) */
  tertiaryInk: "#005f90",
  tertiaryBadgeBg: "rgba(0, 121, 182, 0.1)",
  tertiaryBadgeBorder: "rgba(0, 95, 144, 0.2)",
  secondaryFixed: "#e3e3de",
  secondaryContainer: "#e0e0db",
  /** Home stats bar — warm light grey (Stitch marketing strip) */
  statsBarSurface: "#eae9e4",
  surfacePearl: "#f6f6f3",
  surfaceTile1: "#272729",
  surfaceTile2: "#2A2A2C",
  surfaceTile3: "#252527",
  surfaceBlack: "#000000",
  surfaceChipTranslucent: "#D2D2D7",
  onPrimary: "#ffffff",
  onDark: "#ffffff",
  neutral: "#ffffff",
  primaryDeep: "#cc001f",
  surface: "#ffffff",
  surfaceRaised: "#ffffff",
  successGreen: "#2ECC8A",
  alertRed: "#D92D20",
  ivory: "#ffffff",
  ivoryMuted: "rgba(255,255,255,0.88)",
  obsidian: "#000000",
} as const;

export const accentBorderSubtle = "rgba(230, 0, 35, 0.35)";
export const accentBorderStrong = "rgba(67, 94, 229, 0.5)";
export const accentWash = "rgba(230, 0, 35, 0.1)";
export const accentWashDeep = "rgba(230, 0, 35, 0.16)";

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
  surfaceMuted: palette.hairlineSoft,
  statsBarSurface: palette.statsBarSurface,
  searchBarFill: palette.secondaryContainer,
  /** Icon wells, Stitch `secondary-container` */
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
  shadowColor: palette.primaryFocus,
  shadowOffset: { width: 0, height: 0 },
  shadowOpacity: 0.28,
  shadowRadius: 0,
  elevation: 0,
} as const;

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
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 4,
  },
  tabFab: {
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 8,
  },
  accentRing: accentRingShadow,
  goldRing: accentRingShadow,
} as const;

export const appleSpacing = {
  xxs: 4,
  xs: 8,
  sm: 12,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
  section: 64,
  gutter: 24,
} as const;

export const buttonPrimaryPadding = {
  paddingVertical: 10,
  paddingHorizontal: 18,
  minHeight: 44,
} as const;

export const space = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
  xxxl: 40,
  sectionX: appleSpacing.gutter,
} as const;

/** Stitch: pin `rounded-xl` ≈ 12px, product cards 16px, hero cards 32px, pills full */
export const radii = {
  none: 0,
  xs: 8,
  sm: 8,
  md: 12,
  xl: 16,
  lg: 32,
  pill: 9999,
} as const;

/** Stitch / editorial — display & product titles (Georgia on web; system serif on native). */
const HEADING_SERIF: string =
  Platform.OS === "web"
    ? 'Georgia, "Times New Roman", Times, serif'
    : Platform.OS === "ios"
      ? "Georgia"
      : "serif";

export const fontFamilies = {
  displayRegular: "Inter_400Regular",
  displayMedium: "Inter_500Medium",
  displaySemiBold: "Inter_600SemiBold",
  displayBold: "Inter_600SemiBold",
  /** Headlines, section titles, card titles — matches featured hero title. */
  headingSerif: HEADING_SERIF,
  body: "Inter_400Regular",
  bodyMedium: "Inter_500Medium",
  bodySemiBold: "Inter_600SemiBold",
  bodyBold: "Inter_600SemiBold",
} as const;

export const fontMono = fontFamilies.bodySemiBold;

export const typography = {
  display: {
    fontSize: 34,
    lineHeight: 38,
    fontWeight: "600" as TextStyle["fontWeight"],
    color: palette.ink,
    letterSpacing: -1.0,
    fontFamily: fontFamilies.headingSerif,
  },
  title: {
    fontSize: 28,
    lineHeight: 34,
    fontWeight: "600" as TextStyle["fontWeight"],
    color: palette.ink,
    letterSpacing: -0.8,
    fontFamily: fontFamilies.headingSerif,
  },
  section: {
    fontSize: 22,
    lineHeight: 28,
    fontWeight: "600" as TextStyle["fontWeight"],
    color: palette.ink,
    letterSpacing: -1.2,
    fontFamily: fontFamilies.headingSerif,
  },
  cardTitle: {
    fontSize: 17,
    lineHeight: 22,
    fontWeight: "600" as TextStyle["fontWeight"],
    color: palette.onSurface,
    letterSpacing: -0.3,
    fontFamily: fontFamilies.headingSerif,
  },
  body: {
    fontSize: 16,
    lineHeight: 22,
    fontWeight: "400" as TextStyle["fontWeight"],
    color: palette.body,
    letterSpacing: 0,
    fontFamily: fontFamilies.body,
  },
  caption: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: "400" as TextStyle["fontWeight"],
    color: palette.inkMuted48,
    letterSpacing: 0,
    fontFamily: fontFamilies.body,
  },
  label: {
    fontSize: 12,
    lineHeight: 16,
    fontWeight: "600" as TextStyle["fontWeight"],
    color: palette.inkMuted80,
    letterSpacing: 0.15,
    fontFamily: fontFamilies.bodySemiBold,
  },
} as const;
