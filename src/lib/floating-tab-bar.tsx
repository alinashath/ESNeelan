import type { ReactNode } from "react";
import { colors, fontFamilies, shadows, space } from "@/src/theme/tokens";
import { BlurView } from "expo-blur";
import { Platform, StyleSheet, View, type ViewStyle } from "react-native";

export const FLOATING_TAB_BAR_HEIGHT = 64;
export const FLOATING_TAB_BAR_MARGIN_H = 16;
export const FLOATING_TAB_BAR_MARGIN_BOTTOM = 12;
export const FLOATING_TAB_BAR_RADIUS = 999;

/** Extra scroll clearance so content clears the floating bar + safe area. */
export function floatingTabBarBottomInset(safeBottom: number): number {
  return (
    safeBottom + FLOATING_TAB_BAR_MARGIN_BOTTOM + FLOATING_TAB_BAR_HEIGHT + space.sm
  );
}

const glassShellStyle: ViewStyle = {
  borderRadius: FLOATING_TAB_BAR_RADIUS,
  overflow: "hidden",
  borderWidth: 1,
  borderColor: "rgba(255, 255, 255, 0.55)",
  ...shadows.productImage,
  ...(Platform.OS === "web"
    ? ({
        boxShadow:
          "0 10px 40px rgba(0, 0, 0, 0.14), inset 0 1px 0 rgba(255, 255, 255, 0.72)",
      } as ViewStyle)
    : null),
};

type GlassProps = {
  children: ReactNode;
  style?: ViewStyle;
};

export function FloatingTabBarGlass({ children, style }: GlassProps) {
  const webGlassLayer: ViewStyle =
    Platform.OS === "web"
      ? ({
          backgroundColor: "rgba(255, 255, 255, 0.22)",
          backdropFilter: "blur(32px) saturate(200%)",
          WebkitBackdropFilter: "blur(32px) saturate(200%)",
        } as ViewStyle)
      : {};

  return (
    <View style={[glassShellStyle, style]}>
      {Platform.OS === "web" ? (
        <View pointerEvents="none" style={[StyleSheet.absoluteFill, webGlassLayer]} />
      ) : (
        <>
          <BlurView
            intensity={Platform.OS === "ios" ? 90 : 76}
            tint="light"
            experimentalBlurMethod={
              Platform.OS === "android" ? "dimezisBlurView" : undefined
            }
            style={StyleSheet.absoluteFill}
          />
          <View
            pointerEvents="none"
            style={[
              StyleSheet.absoluteFill,
              { backgroundColor: "rgba(255, 255, 255, 0.18)" },
            ]}
          />
        </>
      )}
      <View style={styles.content}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  content: {
    position: "relative",
    zIndex: 1,
    width: "100%",
  },
});

export const floatingTabIndicatorStyle = {
  backgroundColor: "rgba(230, 0, 35, 0.12)",
  borderRadius: 999,
  borderWidth: StyleSheet.hairlineWidth,
  borderColor: "rgba(230, 0, 35, 0.16)",
} as const;

export const floatingTabLabelStyle = {
  fontSize: 10,
  fontWeight: "600" as const,
  fontFamily: fontFamilies.body,
  marginTop: 2,
};

export const floatingTabActiveColor = colors.primary;
export const floatingTabInactiveColor = colors.textMuted;

export const floatingTabSlotStyle = {
  flex: 1,
  height: FLOATING_TAB_BAR_HEIGHT,
  alignItems: "center" as const,
  justifyContent: "center" as const,
};
