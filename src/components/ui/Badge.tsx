import { View, type ViewProps } from "react-native";
import { colors, radii, space } from "@/src/theme/tokens";
import { TextCaption } from "./TextCaption";

type Props = ViewProps & {
  title: string;
  variant?: "neutral" | "accent" | "danger" | "warning";
};

const bg: Record<NonNullable<Props["variant"]>, string> = {
  neutral: colors.surfaceMuted,
  accent: colors.accent,
  danger: colors.danger,
  warning: colors.warning,
};

export function Badge({ title, variant = "neutral", style, ...rest }: Props) {
  const backgroundColor = bg[variant];
  const textColor =
    variant === "accent" || variant === "warning"
      ? colors.primary
      : variant === "danger"
        ? colors.white
        : colors.text;
  return (
    <View
      style={[
        {
          alignSelf: "flex-start",
          paddingHorizontal: space.md,
          paddingVertical: space.xs,
          borderRadius: radii.sm,
          backgroundColor,
        },
        style,
      ]}
      {...rest}
    >
      <TextCaption style={{ color: textColor, fontWeight: "700" }}>
        {title}
      </TextCaption>
    </View>
  );
}
