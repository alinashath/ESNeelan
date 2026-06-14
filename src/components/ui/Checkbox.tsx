import { Pressable, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { colors, space } from "@/src/theme/tokens";
import { TextBody } from "./TextBody";

type Props = {
  checked: boolean;
  onToggle: () => void;
  label: string;
};

export function Checkbox({ checked, onToggle, label }: Props) {
  return (
    <Pressable
      accessibilityRole="checkbox"
      accessibilityState={{ checked }}
      onPress={onToggle}
      style={({ pressed }) => ({
        flexDirection: "row",
        alignItems: "center",
        gap: space.md,
        opacity: pressed ? 0.85 : 1,
      })}
    >
      <View
        style={{
          width: 24,
          height: 24,
          borderRadius: 6,
          borderWidth: 2,
          borderColor: checked ? colors.primary : colors.border,
          backgroundColor: checked ? colors.primary : "transparent",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        {checked ? <Ionicons name="checkmark" size={16} color={colors.onAccent} /> : null}
      </View>
      <TextBody style={{ flex: 1 }}>{label}</TextBody>
    </Pressable>
  );
}
