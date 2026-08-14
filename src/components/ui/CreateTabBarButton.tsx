import { accentBorderSubtle, colors, radii, shadows } from "@/src/theme/tokens";
import { Ionicons } from "@expo/vector-icons";
import { useRef } from "react";
import { Pressable, StyleSheet, View, type PressableProps, type ViewStyle } from "react-native";
import LottieView from "lottie-react-native";
import { useReducedMotion } from "react-native-reanimated";

type Props = Pick<PressableProps, "onPress" | "accessibilityState" | "testID"> & {
  /** Inline centered sell control for the floating glass tab bar. */
  floating?: boolean;
  style?: ViewStyle;
};

/** Center “Sell” tab — floating bar uses inline circle; legacy uses raised FAB. */
export function CreateTabBarButton({
  onPress,
  accessibilityState,
  testID,
  floating = false,
  style,
}: Props) {
  const lottieRef = useRef<LottieView>(null);
  const reducedMotion = useReducedMotion();
  const playFeedback = () => {
    if (reducedMotion) return;
    lottieRef.current?.reset();
    lottieRef.current?.play(0, 24);
  };
  const animatedIcon = (
    <>
      <LottieView
        ref={lottieRef}
        source={require("../../../assets/animations/nav-tap.json")}
        loop={false}
        autoPlay={false}
        colorFilters={[{ keypath: "Pulse", color: colors.onAccent }]}
        style={StyleSheet.absoluteFill}
      />
      <Ionicons name="add" size={floating ? 26 : 30} color={colors.onAccent} />
    </>
  );

  if (floating) {
    return (
      <View style={[{ alignItems: "center", justifyContent: "center" }, style]}>
        <Pressable
          testID={testID}
          accessibilityRole="button"
          accessibilityState={accessibilityState}
          onPressIn={playFeedback}
          onPress={onPress}
          style={({ pressed }) => ({
            width: 44,
            height: 44,
            borderRadius: radii.sm,
            backgroundColor: colors.accent,
            alignItems: "center",
            justifyContent: "center",
            opacity: pressed ? 0.9 : 1,
            borderWidth: 1,
            borderColor: accentBorderSubtle,
            zIndex: 1,
            ...shadows.tabFab,
          })}
        >
          {animatedIcon}
        </Pressable>
      </View>
    );
  }

  return (
    <View style={[{ flex: 1, alignItems: "center", justifyContent: "center" }, style]}>
      <Pressable
        testID={testID}
        accessibilityRole="button"
        accessibilityState={accessibilityState}
        onPressIn={playFeedback}
        onPress={onPress}
        style={({ pressed }) => ({
          width: 52,
          height: 52,
          marginTop: -22,
          borderRadius: radii.md,
          backgroundColor: colors.accent,
          alignItems: "center",
          justifyContent: "center",
          opacity: pressed ? 0.9 : 1,
          borderWidth: 1,
          borderColor: accentBorderSubtle,
          ...shadows.tabFab,
        })}
      >
        {animatedIcon}
      </Pressable>
    </View>
  );
}
