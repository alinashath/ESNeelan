import { Pressable } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { colors } from "@/src/theme/tokens";

/** Use on nested admin stack **index** screens — `replace` avoids stacking duplicate `/admin` routes (back-loop). */
export function AdminStackIndexBack() {
  return (
    <Pressable
      onPress={() => router.replace("/admin")}
      hitSlop={12}
      accessibilityRole="button"
      accessibilityLabel="Back to admin dashboard"
      style={{ paddingHorizontal: 4, paddingVertical: 8 }}
    >
      <Ionicons name="chevron-back" size={26} color={colors.text} />
    </Pressable>
  );
}
