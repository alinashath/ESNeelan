import { Pressable, type PressableProps } from "react-native";
import { colors, radii, space } from "@/src/theme/tokens";
import { TextBody } from "./TextBody";

type Props = PressableProps & { title: string };

export function ButtonSecondary({ title, disabled, style, ...rest }: Props) {
  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled}
      style={(state) => {
        const fromParent =
          typeof style === "function" ? style(state) : style;
        return [
          {
            borderWidth: 1.5,
            borderColor: colors.primary,
            paddingVertical: space.md,
            paddingHorizontal: space.xl,
            borderRadius: radii.md,
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: colors.background,
            opacity: state.pressed ? 0.75 : disabled ? 0.45 : 1,
          },
          fromParent,
        ];
      }}
      {...rest}
    >
      <TextBody style={{ color: colors.primary, fontWeight: "600" }}>
        {title}
      </TextBody>
    </Pressable>
  );
}
