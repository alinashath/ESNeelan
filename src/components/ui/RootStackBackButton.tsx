import { Pressable, StyleSheet, View } from "react-native";
import { useRef } from "react";
import LottieView from "lottie-react-native";
import { useReducedMotion } from "react-native-reanimated";
import { Ionicons } from "@expo/vector-icons";
import { router, type Href } from "expo-router";
import { colors, radii, shadows } from "@/src/theme/tokens";

export const NAV_BUTTON_SIZE = 44;
export const NAV_ICON_SIZE = 22;

type Props = {
  /** When the navigator has nothing to pop (e.g. cold open), go here instead. */
  fallbackHref?: Href;
  /** Icon color (e.g. black on transparent auction hero). */
  tintColor?: string;
  /**
   * Frosted circular well — use on `headerTransparent` screens over photography
   * so the chevron stays legible (auction detail).
   */
  heroWell?: boolean;
};

/**
 * Chevron-only back for root-stack and nested-stack roots — avoids iOS showing
 * route group names like "(tabs)" next to the back arrow.
 */
export function RootStackBackButton({
  fallbackHref = "/(tabs)" as Href,
  tintColor = colors.text,
  heroWell = false,
}: Props) {
  const lottieRef = useRef<LottieView>(null);
  const reducedMotion = useReducedMotion();
  const icon = <Ionicons name="chevron-back" size={NAV_ICON_SIZE} color={tintColor} />;
  return (
    <Pressable
      onPress={() => {
        if (router.canGoBack()) {
          router.back();
        } else {
          router.replace(fallbackHref);
        }
      }}
      onPressIn={() => {
        if (reducedMotion) return;
        lottieRef.current?.reset();
        lottieRef.current?.play(0, 24);
      }}
      hitSlop={12}
      accessibilityRole="button"
      accessibilityLabel="Go back"
      style={styles.touchTarget}
    >
      {heroWell ? (
        <View
          style={{
            width: NAV_BUTTON_SIZE,
            height: NAV_BUTTON_SIZE,
            borderRadius: radii.pill,
            backgroundColor: "rgba(255,255,255,0.94)",
            borderWidth: StyleSheet.hairlineWidth,
            borderColor: colors.border,
            alignItems: "center",
            justifyContent: "center",
            ...shadows.productImage,
          }}
        >
          <LottieView
            ref={lottieRef}
            source={require("../../../assets/animations/nav-tap.json")}
            loop={false}
            autoPlay={false}
            style={StyleSheet.absoluteFill}
          />
          {icon}
        </View>
      ) : (
        <View style={styles.iconSlot}>
          <LottieView
            ref={lottieRef}
            source={require("../../../assets/animations/nav-tap.json")}
            loop={false}
            autoPlay={false}
            style={StyleSheet.absoluteFill}
          />
          {icon}
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  iconSlot: {
    width: NAV_BUTTON_SIZE,
    height: NAV_BUTTON_SIZE,
    alignItems: "center",
    justifyContent: "center",
  },
  touchTarget: {
    width: NAV_BUTTON_SIZE,
    height: NAV_BUTTON_SIZE,
    alignItems: "center",
    justifyContent: "center",
  },
});

/** For `headerLeft: makeRootStackBackHeader("/(tabs)/profile")` */
export function makeRootStackBackHeader(
  fallbackHref: Href = "/(tabs)" as Href,
  tintColor?: string,
  heroWell?: boolean,
) {
  return function HeaderBack() {
    return (
      <RootStackBackButton fallbackHref={fallbackHref} tintColor={tintColor} heroWell={heroWell} />
    );
  };
}
