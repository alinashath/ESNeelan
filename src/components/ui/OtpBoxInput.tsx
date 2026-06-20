import { useRef } from "react";
import {
  Pressable,
  Text,
  TextInput,
  View,
  type StyleProp,
  type ViewStyle,
} from "react-native";
import { colors, fontFamilies, radii, space } from "@/src/theme/tokens";
import { TextCaption } from "./TextCaption";
import { TextLabel } from "./TextLabel";

type Props = {
  label: string;
  length: number;
  value: string;
  onChange: (digits: string) => void;
  error?: string | null;
  autoFocus?: boolean;
  prefix?: string;
  style?: StyleProp<ViewStyle>;
};

export function OtpBoxInput({
  label,
  length,
  value,
  onChange,
  error,
  autoFocus,
  prefix,
  style,
}: Props) {
  const inputRef = useRef<TextInput>(null);
  const digits = value.replace(/\D/g, "").slice(0, length);
  const focusIndex = Math.min(digits.length, length - 1);

  function handleChange(raw: string) {
    onChange(raw.replace(/\D/g, "").slice(0, length));
  }

  return (
    <View style={[{ marginBottom: space.lg }, style]}>
      <TextLabel style={{ marginBottom: space.sm }}>{label}</TextLabel>
      {prefix ? (
        <TextCaption style={{ marginBottom: space.sm, color: colors.textSecondary }}>
          {prefix}
        </TextCaption>
      ) : null}
      <Pressable
        onPress={() => inputRef.current?.focus()}
        accessibilityRole="none"
        style={{ position: "relative" }}
      >
        <View style={{ flexDirection: "row", gap: space.sm }}>
          {Array.from({ length }, (_, i) => {
            const char = digits[i] ?? "";
            const focused = i === focusIndex && !error;
            const errored = Boolean(error);
            return (
              <View
                key={i}
                style={{
                  flex: 1,
                  minWidth: 36,
                  maxWidth: 48,
                  height: 52,
                  borderWidth: 1.5,
                  borderColor: errored
                    ? colors.danger
                    : focused
                      ? colors.accent
                      : char
                        ? colors.border
                        : colors.border,
                  borderRadius: radii.md,
                  backgroundColor: colors.surfaceCard,
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Text
                  style={{
                    fontSize: 20,
                    fontWeight: "600",
                    fontFamily: fontFamilies.bodySemiBold,
                    color: colors.text,
                    letterSpacing: 0.5,
                  }}
                >
                  {char}
                </Text>
              </View>
            );
          })}
        </View>
        <TextInput
          ref={inputRef}
          value={digits}
          onChangeText={handleChange}
          keyboardType="number-pad"
          textContentType="oneTimeCode"
          autoComplete="one-time-code"
          maxLength={length}
          autoFocus={autoFocus}
          caretHidden
          style={{
            position: "absolute",
            opacity: 0,
            width: 1,
            height: 1,
          }}
          accessibilityLabel={label}
        />
      </Pressable>
      {error ? (
        <TextCaption style={{ marginTop: space.sm, color: colors.danger }}>{error}</TextCaption>
      ) : null}
    </View>
  );
}
