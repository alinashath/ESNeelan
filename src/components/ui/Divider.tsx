import { View } from "react-native";
import { colors, space } from "@/src/theme/tokens";

export function Divider() {
  return (
    <View
      style={{
        height: 1,
        backgroundColor: colors.border,
        marginVertical: space.md,
      }}
    />
  );
}
