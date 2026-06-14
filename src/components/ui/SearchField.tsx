import { Ionicons } from "@expo/vector-icons";
import { Pressable, TextInput, View, type TextInputProps } from "react-native";
import { colors, radii, space } from "@/src/theme/tokens";

type Props = TextInputProps;

const MIN_H = 48;

export function SearchField({
  style,
  value,
  onChangeText,
  placeholder,
  accessibilityLabel,
  ...rest
}: Props) {
  const showClear = typeof value === "string" && value.length > 0 && typeof onChangeText === "function";
  const inputA11y =
    accessibilityLabel ??
    (typeof placeholder === "string" && placeholder.length > 0
      ? `Search field, ${placeholder}`
      : "Search");

  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        borderRadius: radii.lg,
        backgroundColor: colors.surfaceMuted,
        borderWidth: 1,
        borderColor: "rgba(15, 23, 42, 0.08)",
        paddingHorizontal: space.md,
        minHeight: MIN_H,
      }}
      accessibilityRole="search"
    >
      <Ionicons name="search" size={20} color={colors.textMuted} />
      <TextInput
        placeholder={placeholder}
        placeholderTextColor={colors.textMuted}
        value={value}
        onChangeText={onChangeText}
        returnKeyType="search"
        autoCorrect={false}
        autoCapitalize="none"
        clearButtonMode="never"
        accessibilityLabel={inputA11y}
        style={[
          {
            flex: 1,
            marginLeft: space.sm,
            paddingVertical: space.sm,
            fontSize: 16,
            lineHeight: 22,
            color: colors.text,
            minHeight: MIN_H - 4,
          },
          style,
        ]}
        {...rest}
      />
      {showClear ? (
        <Pressable
          onPress={() => onChangeText?.("")}
          hitSlop={12}
          accessibilityRole="button"
          accessibilityLabel="Clear search"
          style={({ pressed }) => ({ opacity: pressed ? 0.55 : 1, padding: 4 })}
        >
          <Ionicons name="close-circle" size={22} color={colors.textMuted} />
        </Pressable>
      ) : null}
    </View>
  );
}
