import { Pressable, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { colors, space } from "@/src/theme/tokens";

type Props = {
  value: number;
  onChange: (n: number) => void;
  size?: number;
};

export function StarRating({ value, onChange, size = 36 }: Props) {
  return (
    <View style={{ flexDirection: "row", gap: space.sm }}>
      {[1, 2, 3, 4, 5].map((n) => {
        const filled = n <= value;
        return (
          <Pressable
            key={n}
            accessibilityRole="button"
            accessibilityLabel={`${n} stars`}
            onPress={() => onChange(n)}
            hitSlop={8}
          >
            <Ionicons
              name={filled ? "star" : "star-outline"}
              size={size}
              color={filled ? colors.accent : colors.textMuted}
            />
          </Pressable>
        );
      })}
    </View>
  );
}
