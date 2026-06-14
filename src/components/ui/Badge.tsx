import { View, type ViewProps } from "react-native";
import { accentBorderSubtle, colors, radii, space } from "@/src/theme/tokens";
import { TextCaption } from "./TextCaption";

type Props = ViewProps & {
  title: string;
  variant?: "neutral" | "accent" | "danger" | "warning";
};

const shell = {
  alignSelf: "flex-start" as const,
  paddingHorizontal: space.md,
  paddingVertical: space.xs,
  borderWidth: 1,
};

export function Badge({ title, variant = "neutral", style, ...rest }: Props) {
  const palette =
    variant === "accent"
      ? {
          backgroundColor: colors.accentMuted,
          borderColor: accentBorderSubtle,
          color: colors.accent,
        }
      : variant === "danger" || variant === "warning"
        ? {
            backgroundColor: "rgba(232,85,85,0.12)",
            borderColor: "rgba(232,85,85,0.3)",
            color: colors.danger,
          }
        : {
            backgroundColor: colors.tertiaryMuted,
            borderColor: colors.border,
            color: colors.textMuted,
          };

  return (
    <View
      style={[
        shell,
        {
          borderRadius: radii.pill,
          backgroundColor: palette.backgroundColor,
          borderColor: palette.borderColor,
        },
        style,
      ]}
      {...rest}
    >
      <TextCaption style={{ color: palette.color, fontWeight: "600" }}>
        {title}
      </TextCaption>
    </View>
  );
}
