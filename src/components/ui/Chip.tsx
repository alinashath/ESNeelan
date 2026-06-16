import { Pressable, type PressableProps } from "react-native";
import { colors, goldBorderSubtle, radii, space } from "@/src/theme/tokens";
import { TextCaption } from "./TextCaption";

type Props = PressableProps & {
  title: string;
  selected?: boolean;
  /** Tighter pill for dense rows (e.g. home category strip). */
  compact?: boolean;
  /**
   * `neon` — explore / filters (gold tint when selected).
   * `outlined` — home quick tags (border + gold when selected).
   */
  appearance?: "neon" | "outlined";
};

export function Chip({
  title,
  selected,
  appearance = "neon",
  compact,
  style,
  ...rest
}: Props) {
  const outlined = appearance === "outlined";

  const padH = compact ? 16 : space.lg;
  const padV = compact ? 8 : space.sm;

  const bg = outlined
    ? selected
      ? colors.tertiary
      : colors.chipIdle
    : selected
      ? colors.accentTint
      : colors.surfaceMuted;

  const border = outlined
    ? { borderWidth: 0 }
    : selected
      ? { borderWidth: 1, borderColor: goldBorderSubtle }
      : { borderWidth: 1, borderColor: colors.border };

  const textColor = outlined ? (selected ? colors.onAccent : colors.text) : selected ? colors.accent : colors.text;

  return (
    <Pressable
      {...rest}
      accessibilityRole="button"
      accessibilityState={{ selected: !!selected }}
      accessibilityLabel={title}
      style={(state) => {
        const fromParent =
          typeof style === "function" ? style(state) : style;
        return [
          {
            paddingHorizontal: padH,
            paddingVertical: padV,
            borderRadius: radii.pill,
            backgroundColor: bg,
            opacity: state.pressed ? 0.85 : 1,
            ...border,
          },
          fromParent,
        ];
      }}
    >
      <TextCaption
        style={{
          color: textColor,
          fontWeight: outlined ? (selected ? "600" : "500") : selected ? "600" : "400",
          fontSize: compact ? 12 : undefined,
          lineHeight: compact ? 15 : undefined,
        }}
      >
        {title}
      </TextCaption>
    </Pressable>
  );
}
