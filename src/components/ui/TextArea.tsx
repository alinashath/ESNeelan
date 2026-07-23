import { TextInput, View, type TextInputProps } from "react-native";
import { colors, radii, space } from "@/src/theme/tokens";
import { TextLabel } from "./TextLabel";

type Props = TextInputProps & { label: string };

export function TextArea({ label, style, ...rest }: Props) {
  return (
    <View style={{ marginBottom: space.lg }}>
      <TextLabel style={{ marginBottom: space.sm }}>{label}</TextLabel>
      <TextInput
        multiline
        textAlignVertical="top"
        placeholderTextColor={colors.textMuted}
        style={[
          {
            minHeight: 120,
            borderWidth: 1,
            borderColor: colors.border,
            borderRadius: radii.sm,
            paddingHorizontal: 12,
            paddingVertical: space.sm,
            fontSize: 16,
            lineHeight: 24,
            color: colors.text,
            backgroundColor: colors.white,
          },
          style,
        ]}
        {...rest}
      />
    </View>
  );
}
