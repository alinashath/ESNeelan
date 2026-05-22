import { Platform, TextStyle } from "react-native";

/** BIDSTREAM design tokens — use only via components, not raw in screens. */
export const colors = {
  primary: "#000000",
  background: "#FFFFFF",
  surfaceMuted: "#F5F5F5",
  accent: "#D4FF00",
  text: "#000000",
  textSecondary: "#444444",
  textMuted: "#888888",
  border: "#E8E8E8",
  danger: "#FF2D2D",
  warning: "#FFB800",
  white: "#FFFFFF",
} as const;

export const radii = {
  sm: 8,
  md: 12,
  lg: 16,
  pill: 999,
} as const;

export const space = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
} as const;

export const typography = {
  display: {
    fontSize: 28,
    lineHeight: 34,
    fontWeight: "700" as TextStyle["fontWeight"],
    color: colors.text,
    letterSpacing: -0.5,
  },
  title: {
    fontSize: 22,
    lineHeight: 28,
    fontWeight: "700" as TextStyle["fontWeight"],
    color: colors.text,
  },
  section: {
    fontSize: 20,
    lineHeight: 26,
    fontWeight: "700" as TextStyle["fontWeight"],
    color: colors.text,
  },
  body: {
    fontSize: 15,
    lineHeight: 22,
    fontWeight: "400" as TextStyle["fontWeight"],
    color: colors.textSecondary,
  },
  caption: {
    fontSize: 13,
    lineHeight: 18,
    fontWeight: "400" as TextStyle["fontWeight"],
    color: colors.textMuted,
  },
  label: {
    fontSize: 11,
    lineHeight: 14,
    fontWeight: "600" as TextStyle["fontWeight"],
    color: colors.textMuted,
    textTransform: "uppercase" as TextStyle["textTransform"],
    letterSpacing: 0.6,
  },
} as const;

export const fontFamily = Platform.select({
  ios: { regular: "System", medium: "System" },
  android: { regular: "sans-serif", medium: "sans-serif-medium" },
  default: { regular: "System", medium: "System" },
});
