import { Pressable, StyleSheet, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { router, type Href } from "expo-router";
import { colors, shadows } from "@/src/theme/tokens";

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
  const icon = <Ionicons name="chevron-back" size={26} color={tintColor} />;
  return (
    <Pressable
      onPress={() => {
        if (router.canGoBack()) {
          router.back();
        } else {
          router.replace(fallbackHref);
        }
      }}
      hitSlop={12}
      accessibilityRole="button"
      accessibilityLabel="Go back"
      style={
        heroWell
          ? {
              paddingHorizontal: 2,
              paddingVertical: 4,
            }
          : { paddingHorizontal: 4, paddingVertical: 8 }
      }
    >
      {heroWell ? (
        <View
          style={{
            width: 40,
            height: 40,
            borderRadius: 20,
            backgroundColor: "rgba(255,255,255,0.94)",
            borderWidth: StyleSheet.hairlineWidth,
            borderColor: colors.border,
            alignItems: "center",
            justifyContent: "center",
            ...shadows.productImage,
          }}
        >
          {icon}
        </View>
      ) : (
        icon
      )}
    </Pressable>
  );
}

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
