import { Pressable, type PressableProps } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { colors, fontFamilies, radii, space } from "@/src/theme/tokens";
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
            borderColor: colors.primary,
            minHeight: 48,
            paddingVertical: 11,
            paddingHorizontal: space.lg,
            borderRadius: radii.sm,
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: state.pressed ? colors.tertiaryMuted : colors.white,
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
      <TextBody style={{ color: colors.primary, fontFamily: fontFamilies.bodySemiBold, fontWeight: "600", fontSize: 14, lineHeight: 20, letterSpacing: 0.2 }}>
        {title}
      </TextBody>
    </Pressable>
  );
}
