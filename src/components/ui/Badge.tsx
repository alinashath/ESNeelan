import { View, type ViewProps } from "react-native";
import { accentBorderSubtle, colors, radii, space } from "@/src/theme/tokens";
import { TextCaption } from "./TextCaption";

type Props = ViewProps & {
  title: string;
  variant?: "neutral" | "accent" | "danger" | "warning";
  /** Smaller pill for auction detail / dense rows. */
  compact?: boolean;
};

const shell = {
  alignSelf: "flex-start" as const,
  paddingHorizontal: space.md,
  paddingVertical: space.xs,
  borderWidth: 1,
};

const shellCompact = {
  alignSelf: "flex-start" as const,
  paddingHorizontal: 10,
  paddingVertical: 4,
  borderWidth: 1,
};

export function Badge({
  title,
  variant = "neutral",
  compact,
  style,
  ...rest
}: Props) {
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
        compact ? shellCompact : shell,
        {
          borderRadius: radii.pill,
          backgroundColor: palette.backgroundColor,
          borderColor: palette.borderColor,
        },
        style,
      ]}
      {...rest}
    >
      <TextCaption
        style={{
          color: palette.color,
          fontWeight: "400",
          fontSize: compact ? 11 : undefined,
          lineHeight: compact ? 14 : undefined,
        }}
      >
        {title}
      </TextCaption>
    </View>
  );
}
