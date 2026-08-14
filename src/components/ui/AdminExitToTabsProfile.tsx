import { Pressable, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { router, type Href } from "expo-router";
import { colors } from "@/src/theme/tokens";
import { NAV_BUTTON_SIZE, NAV_ICON_SIZE } from "./RootStackBackButton";

/** Leave admin entirely — replaces stack so we never bounce between duplicate admin roots. */
export function AdminExitToTabsProfile() {
  return (
    <Pressable
      onPress={() => router.replace("/(tabs)/profile" as Href)}
      hitSlop={12}
      accessibilityRole="button"
      accessibilityLabel="Exit admin"
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
