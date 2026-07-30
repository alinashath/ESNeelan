import { useImageMajorityColor } from "@/src/hooks/useImageMajorityColor";
import { colors, palette, radii } from "@/src/theme/tokens";
import type { ReactNode } from "react";
import type { StyleProp, ViewStyle } from "react-native";
import { Image, StyleSheet, View, type DimensionValue } from "react-native";
import type { AnimatedStyle } from "react-native-reanimated";
import Animated from "react-native-reanimated";

const IMAGE_PLACEHOLDER = palette.dividerSoft;

type Props = {
  uri?: string | null;
  /** Fixed height — use alone or with `width`. */
  height?: number;
  /** Width ÷ height sizing when `height` is omitted. */
  aspectRatio?: number;
  width?: DimensionValue;
  maxHeight?: number;
  borderRadius?: number;
  showBorder?: boolean;
  borderColor?: string;
  photoAnimStyle?: StyleProp<AnimatedStyle<ViewStyle>>;
  children?: ReactNode;
  accessibilityLabel?: string;
  style?: StyleProp<ViewStyle>;
};

function containerSizeStyle({
  height,
  aspectRatio,
  width = "100%",
  maxHeight,
}: Pick<Props, "height" | "aspectRatio" | "width" | "maxHeight">): ViewStyle {
  if (height != null) {
    return { width, height, ...(maxHeight != null ? { maxHeight } : null) };
  }
  if (aspectRatio != null) {
    return {
      width,
      aspectRatio,
      ...(maxHeight != null ? { maxHeight } : null),
    };
  }
  return { width, height: 200 };
}

/**
 * Photo — `contain` fit with letterbox fill from the image majority / dominant color.
 */
export function ContainedListingPhoto({
  uri,
  height,
  aspectRatio,
  width = "100%",
  maxHeight,
  borderRadius = radii.md,
  showBorder = true,
  borderColor = colors.border,
  photoAnimStyle,
  children,
  accessibilityLabel,
  style,
}: Props) {
  const majorityColor = useImageMajorityColor(uri);
  const backgroundColor = majorityColor ?? colors.surfaceMuted;

  return (
    <View
      accessibilityLabel={accessibilityLabel}
      style={[
        containerSizeStyle({ height, aspectRatio, width, maxHeight }),
        {
          borderRadius,
          overflow: "hidden",
          backgroundColor,
          ...(showBorder
            ? {
                borderWidth: StyleSheet.hairlineWidth,
                borderColor,
              }
            : null),
        },
        style,
      ]}
    >
      {uri ? (
        <Animated.View style={[{ width: "100%", height: "100%" }, photoAnimStyle]}>
          <Image
            source={{ uri }}
            style={{ width: "100%", height: "100%" }}
            resizeMode="contain"
            accessibilityLabel={accessibilityLabel}
          />
        </Animated.View>
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
