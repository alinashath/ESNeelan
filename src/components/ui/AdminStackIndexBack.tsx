import { Pressable, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { colors } from "@/src/theme/tokens";
import { NAV_BUTTON_SIZE, NAV_ICON_SIZE } from "./RootStackBackButton";

/** Use on nested admin stack **index** screens — `replace` avoids stacking duplicate `/admin` routes (back-loop). */
export function AdminStackIndexBack() {
  return (
    <Pressable
      onPress={() => router.replace("/admin")}
      hitSlop={12}
      accessibilityRole="button"
      accessibilityLabel="Back to admin dashboard"
      style={styles.button}
    >
      <Ionicons name="chevron-back" size={NAV_ICON_SIZE} color={colors.text} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    width: NAV_BUTTON_SIZE,
    height: NAV_BUTTON_SIZE,
    alignItems: "center",
    justifyContent: "center",
  },
});
