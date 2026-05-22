import { TextInput, View, type TextInputProps } from "react-native";
import { colors, radii, space } from "@/src/theme/tokens";
import { TextLabel } from "./TextLabel";

type Props = TextInputProps & { label: string };

export function TextField({ label, style, ...rest }: Props) {
  return (
    <View style={{ marginBottom: space.lg }}>
      <TextLabel style={{ marginBottom: space.sm }}>{label}</TextLabel>
      <TextInput
        placeholderTextColor={colors.textMuted}
        style={[
          {
            borderWidth: 1,
            borderColor: colors.border,
            borderRadius: radii.md,
            paddingHorizontal: space.lg,
            paddingVertical: space.md,
            fontSize: 15,
            color: colors.text,
            backgroundColor: colors.surfaceMuted,
          },
          style,
        ]}
        {...rest}
      />
    </View>
  );
}
