import { colors, shadows, space } from "@/src/theme/tokens";
import { Ionicons } from "@expo/vector-icons";
import { Pressable, View, type PressableProps } from "react-native";

type Props = Pick<PressableProps, "onPress" | "accessibilityState" | "testID">;

/** Center “Sell” tab — raised block with plus (`primary-container` fill in Stitch). */
export function CreateTabBarButton({
  onPress,
  accessibilityState,
  testID,
}: Props) {
  return (
    <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
      <Pressable
        testID={testID}
        accessibilityRole="button"
        accessibilityState={accessibilityState}
        onPress={onPress}
        style={({ pressed }) => ({
          width: 56,
          height: 56,
          marginTop: -space.lg,
          borderRadius: 14,
          backgroundColor: colors.accent,
          alignItems: "center",
          justifyContent: "center",
          opacity: pressed ? 0.9 : 1,
          borderWidth: 1,
          borderColor: "rgba(183, 0, 26, 0.35)",
          ...shadows.tabFab,
        })}
      >
        <Ionicons name="add" size={32} color={colors.onAccent} />
      </Pressable>
    </View>
  );
}
