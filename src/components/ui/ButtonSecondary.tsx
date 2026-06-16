import { Pressable, type PressableProps } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { colors, goldBorderSubtle, radii, space, buttonPrimaryPadding } from "@/src/theme/tokens";
import { TextBody } from "./TextBody";

type Props = PressableProps & {
  title: string;
  icon?: keyof typeof Ionicons.glyphMap;
};

export function ButtonSecondary({ title, disabled, style, icon, ...rest }: Props) {
  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled}
      style={(state) => {
        const fromParent =
          typeof style === "function" ? style(state) : style;
        return [
          {
            borderWidth: 1,
            borderColor: goldBorderSubtle,
            ...buttonPrimaryPadding,
            borderRadius: radii.pill,
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: "transparent",
            flexDirection: "row",
            gap: space.sm,
            opacity: state.pressed ? 0.75 : disabled ? 0.45 : 1,
          },
          fromParent,
        ];
      }}
      {...rest}
    >
      {icon ? <Ionicons name={icon} size={20} color={colors.primary} /> : null}
      <TextBody style={{ color: colors.primary, fontWeight: "600" }}>
        {title}
      </TextBody>
    </Pressable>
  );
}
