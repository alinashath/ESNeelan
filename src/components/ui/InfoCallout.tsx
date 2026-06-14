import { Ionicons } from "@expo/vector-icons";
import { View } from "react-native";
import { colors, goldBorderSubtle, radii, space } from "@/src/theme/tokens";
import { TextBody } from "./TextBody";

type Props = { message: string };

export function InfoCallout({ message }: Props) {
  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "flex-start",
        backgroundColor: colors.accentTint,
        borderWidth: 1,
        borderColor: goldBorderSubtle,
        padding: space.lg,
        borderRadius: radii.md,
        marginVertical: space.md,
      }}
    >
      <Ionicons
        name="time-outline"
        size={22}
        color={colors.accent}
        style={{ marginRight: space.md, marginTop: 2 }}
      />
      <TextBody style={{ flex: 1, color: colors.text, fontWeight: "600" }}>
        {message}
      </TextBody>
    </View>
  );
}
