import { Pressable } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { router, type Href } from "expo-router";
import { colors } from "@/src/theme/tokens";

/** Leave admin entirely — replaces stack so we never bounce between duplicate admin roots. */
export function AdminExitToTabsProfile() {
  return (
    <Pressable
      onPress={() => router.replace("/(tabs)/profile" as Href)}
      hitSlop={12}
      accessibilityRole="button"
      accessibilityLabel="Exit admin"
      style={{ paddingHorizontal: 4, paddingVertical: 8 }}
    >
      <Ionicons name="chevron-back" size={26} color={colors.text} />
    </Pressable>
  );
}
