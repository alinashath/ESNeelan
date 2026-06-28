import { accentBorderSubtle, colors, shadows } from "@/src/theme/tokens";
import { Ionicons } from "@expo/vector-icons";
import { Pressable, View, type PressableProps, type ViewStyle } from "react-native";

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
  if (floating) {
    return (
      <View style={[{ alignItems: "center", justifyContent: "center" }, style]}>
        <Pressable
          testID={testID}
          accessibilityRole="button"
          accessibilityState={accessibilityState}
          onPress={onPress}
          style={({ pressed }) => ({
            width: 44,
            height: 44,
            borderRadius: 22,
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
          <Ionicons name="add" size={26} color={colors.onAccent} />
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
        onPress={onPress}
        style={({ pressed }) => ({
          width: 52,
          height: 52,
          marginTop: -22,
          borderRadius: 16,
          backgroundColor: colors.accent,
          alignItems: "center",
          justifyContent: "center",
          opacity: pressed ? 0.9 : 1,
          borderWidth: 1,
          borderColor: accentBorderSubtle,
          ...shadows.tabFab,
        })}
      >
        <Ionicons name="add" size={30} color={colors.onAccent} />
      </Pressable>
    </View>
  );
}
