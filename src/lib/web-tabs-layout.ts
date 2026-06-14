import { useWindowDimensions } from "react-native";
import { layout } from "@/src/theme/layout";

const isWeb = process.env.EXPO_OS === "web";

/**
 * Web only: viewport wide enough for site-style top header (logo + text nav).
 * Below this width, tabs move to the bottom with icon-only labels (app-style).
 */
export function useWebWideTabHeader(): boolean {
  const { width } = useWindowDimensions();
  if (!isWeb) return false;
  return width >= layout.breakpoints.md;
}
