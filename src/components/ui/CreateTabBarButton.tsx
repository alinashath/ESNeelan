import { Pressable, View, type PressableProps } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { colors, shadows, space } from "@/src/theme/tokens";

type Props = Pick<PressableProps, "onPress" | "accessibilityState" | "testID">;

/**
 * Center “Sell” tab — raised gold square with obsidian plus (ES Neelan luxury).
 */
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
          borderColor: "rgba(10,10,15,0.35)",
          ...shadows.tabFab,
        })}
      >
        <Ionicons name="add" size={32} color={colors.onAccent} />
      </Pressable>
    </View>
  );
}
