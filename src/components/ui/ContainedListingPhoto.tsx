import { useImageMajorityColor } from "@/src/hooks/useImageMajorityColor";
import { colors, palette, radii } from "@/src/theme/tokens";
import type { ReactNode } from "react";
import type { StyleProp, ViewStyle } from "react-native";
import { Image, Platform, StyleSheet, View } from "react-native";
import type { AnimatedStyle } from "react-native-reanimated";
import Animated from "react-native-reanimated";

const IMAGE_PLACEHOLDER = palette.dividerSoft;
const BLUR_FILL_RADIUS = Platform.select({ ios: 28, android: 18, web: 24, default: 20 }) ?? 20;

type Props = {
  uri?: string | null;
  height: number;
  photoAnimStyle?: StyleProp<AnimatedStyle<ViewStyle>>;
  children?: ReactNode;
};

/**
 * Listing photo — `contain` fit with letterbox fill from the image majority color (web)
 * or a blurred cover while color is loading / unavailable.
 */
export function ContainedListingPhoto({
  uri,
  height,
  photoAnimStyle,
  children,
}: Props) {
  const majorityColor = useImageMajorityColor(uri);
  const backgroundColor = majorityColor ?? colors.surfaceMuted;
  const useBlurredFill = Boolean(uri && !majorityColor);

  return (
    <View
      style={{
        width: "100%",
        height,
        borderRadius: radii.md,
        overflow: "hidden",
        borderWidth: StyleSheet.hairlineWidth,
        borderColor: colors.border,
        backgroundColor,
      }}
    >
      {uri ? (
        <>
          {useBlurredFill ? (
            <Image
              source={{ uri }}
              style={StyleSheet.absoluteFill}
              resizeMode="cover"
              blurRadius={BLUR_FILL_RADIUS}
              accessibilityElementsHidden
              importantForAccessibility="no-hide-descendants"
            />
          ) : null}
          <Animated.View
            style={[{ width: "100%", height: "100%" }, photoAnimStyle]}
          >
            <Image
              source={{ uri }}
              style={{ width: "100%", height: "100%" }}
              resizeMode="contain"
            />
          </Animated.View>
        </>
      ) : (
        <View
          style={{
            width: "100%",
            height: "100%",
            backgroundColor: IMAGE_PLACEHOLDER,
          }}
        />
      )}
      {children}
    </View>
  );
}
