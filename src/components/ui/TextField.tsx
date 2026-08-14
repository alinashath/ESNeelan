import { useState } from "react";
import { TextInput, View, type TextInputProps } from "react-native";
import { colors, fontFamilies, radii, space } from "@/src/theme/tokens";
import { TextLabel } from "./TextLabel";

type Props = TextInputProps & { label: string };

export function TextField({ label, style, onFocus, onBlur, ...rest }: Props) {
  const [focused, setFocused] = useState(false);
  return (
    <View style={{ marginBottom: space.lg }}>
      <TextLabel style={{ marginBottom: space.sm }}>{label}</TextLabel>
      <TextInput
        placeholderTextColor={colors.textMuted}
        style={[
          {
            borderWidth: 1,
            borderColor: focused ? colors.primary : colors.border,
            borderRadius: radii.sm,
            paddingHorizontal: 12,
            paddingVertical: 11,
            minHeight: 48,
            fontSize: 16,
            lineHeight: 24,
            fontFamily: fontFamilies.body,
            color: colors.text,
            backgroundColor: colors.white,
          },
          style,
        ]}
        onFocus={(event) => {
          setFocused(true);
          onFocus?.(event);
        }}
        onBlur={(event) => {
          setFocused(false);
          onBlur?.(event);
        }}
        {...rest}
      />
    </View>
  );
}
