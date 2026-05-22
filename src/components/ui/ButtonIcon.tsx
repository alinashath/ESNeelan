import { Ionicons } from "@expo/vector-icons";
import { Pressable, type PressableProps } from "react-native";
import { colors, radii } from "@/src/theme/tokens";

type Props = PressableProps & {
  name: keyof typeof Ionicons.glyphMap;
  size?: number;
};

export function ButtonIcon({
  name,
  size = 22,
  disabled,
  style,
  ...rest
}: Props) {
  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled}
      style={(state) => {
        const fromParent =
          typeof style === "function" ? style(state) : style;
        return [
          {
            width: 40,
            height: 40,
            borderRadius: radii.pill,
            alignItems: "center",
            justifyContent: "center",
            opacity: state.pressed ? 0.65 : disabled ? 0.35 : 1,
          },
          fromParent,
        ];
      }}
      {...rest}
    >
      <Ionicons name={name} size={size} color={colors.primary} />
    </Pressable>
  );
}
