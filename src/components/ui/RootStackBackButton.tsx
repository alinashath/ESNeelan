import { Pressable } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { router, type Href } from "expo-router";
import { colors } from "@/src/theme/tokens";

type Props = {
  /** When the navigator has nothing to pop (e.g. cold open), go here instead. */
  fallbackHref?: Href;
  /** Icon color (e.g. black on transparent auction hero). */
  tintColor?: string;
};

/**
 * Chevron-only back for root-stack and nested-stack roots — avoids iOS showing
 * route group names like "(tabs)" next to the back arrow.
 */
export function RootStackBackButton({
  fallbackHref = "/(tabs)" as Href,
  tintColor = colors.text,
}: Props) {
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
      style={{ paddingHorizontal: 4, paddingVertical: 8 }}
    >
      <Ionicons name="chevron-back" size={26} color={tintColor} />
    </Pressable>
  );
}

/** For `headerLeft: makeRootStackBackHeader("/(tabs)/profile")` */
export function makeRootStackBackHeader(fallbackHref: Href = "/(tabs)" as Href, tintColor?: string) {
  return function HeaderBack() {
    return <RootStackBackButton fallbackHref={fallbackHref} tintColor={tintColor} />;
  };
}
