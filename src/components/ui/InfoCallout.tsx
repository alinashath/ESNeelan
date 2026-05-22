import { Ionicons } from "@expo/vector-icons";
import { View } from "react-native";
import { colors, radii, space } from "@/src/theme/tokens";
import { TextBody } from "./TextBody";

type Props = { message: string };

export function InfoCallout({ message }: Props) {
  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "flex-start",
        backgroundColor: colors.accent,
        padding: space.lg,
        borderRadius: radii.md,
        marginVertical: space.md,
      }}
    >
      <Ionicons
        name="time-outline"
        size={22}
        color={colors.primary}
        style={{ marginRight: space.md, marginTop: 2 }}
      />
      <TextBody style={{ flex: 1, color: colors.primary, fontWeight: "600" }}>
        {message}
      </TextBody>
    </View>
  );
}
