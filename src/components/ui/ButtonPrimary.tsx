import {
  durationPressInMs,
  durationPressOutMs,
  easingEnter,
} from "@/src/lib/ui-motion";
import { buttonPrimaryPadding, colors, radii, space } from "@/src/theme/tokens";
import { Ionicons } from "@expo/vector-icons";
import {
  ActivityIndicator,
  Pressable,
  type PressableProps,
} from "react-native";
import Animated, {
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import { TextBody } from "./TextBody";

type Props = PressableProps & {
  title: string;
  loading?: boolean;
  /** Optional Ionicons glyph name (shown before label). */
  icon?: keyof typeof Ionicons.glyphMap;
  /** `success` — reserve / confirmation (green). Default primary (Apple blue) CTA. */
  variant?: "primary" | "success";
};

export function ButtonPrimary({
  title,
  loading,
  disabled,
  style,
  icon,
  variant = "primary",
  onPressIn,
  onPressOut,
  ...rest
}: Props) {
  const isDisabled = disabled || loading;
  const bg = variant === "success" ? colors.secondary : colors.accent;
  const fg = colors.onAccent;
  const reducedMotion = useReducedMotion();
  const scale = useSharedValue(1);
  const animatedRoot = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const bumpIn = () => {
    if (reducedMotion || isDisabled) return;
    scale.value = withTiming(0.98, {
      duration: durationPressInMs,
      easing: easingEnter,
    });
  };
  const bumpOut = () => {
    if (reducedMotion || isDisabled) return;
    scale.value = withTiming(1, {
      duration: durationPressOutMs,
      easing: easingEnter,
    });
  };

  return (
    <Animated.View style={[{ alignSelf: "stretch" }, animatedRoot]}>
      <Pressable
        accessibilityRole="button"
        disabled={isDisabled}
        onPressIn={(e) => {
          bumpIn();
          onPressIn?.(e);
        }}
        onPressOut={(e) => {
          bumpOut();
          onPressOut?.(e);
        }}
        style={(state) => {
          const fromParent = typeof style === "function" ? style(state) : style;
          return [
            {
              backgroundColor: bg,
              ...buttonPrimaryPadding,
              borderRadius: radii.pill,
              alignItems: "center",
              justifyContent: "center",
              flexDirection: "row",
              gap: space.sm,
              opacity: state.pressed ? 0.88 : isDisabled ? 0.45 : 1,
            },
            fromParent,
          ];
        }}
        {...rest}
      >
        {loading ? (
          <ActivityIndicator color={fg} />
        ) : (
          <>
            {icon ? <Ionicons name={icon} size={20} color={fg} /> : null}
            <TextBody style={{ color: fg, fontWeight: "600" }}>{title}</TextBody>
          </>
        )}
      </Pressable>
    </Animated.View>
  );
}
