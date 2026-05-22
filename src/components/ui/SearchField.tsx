import { Ionicons } from "@expo/vector-icons";
import { TextInput, View, type TextInputProps } from "react-native";
import { colors, radii, space } from "@/src/theme/tokens";

type Props = TextInputProps;

export function SearchField({ style, ...rest }: Props) {
  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        borderRadius: radii.lg,
        backgroundColor: colors.surfaceMuted,
        paddingHorizontal: space.md,
        borderWidth: 1,
        borderColor: colors.border,
      }}
    >
      <Ionicons name="search" size={18} color={colors.textMuted} />
      <TextInput
        placeholderTextColor={colors.textMuted}
        style={[
          {
            flex: 1,
            marginLeft: space.sm,
            paddingVertical: space.md,
            fontSize: 15,
            color: colors.text,
          },
          style,
        ]}
        {...rest}
      />
    </View>
  );
}
