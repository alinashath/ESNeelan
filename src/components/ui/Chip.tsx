import { Pressable, type PressableProps } from "react-native";
import { colors, fontFamilies, goldBorderSubtle, radii, space } from "@/src/theme/tokens";
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

  const padH = compact ? 12 : space.md;
  const padV = compact ? 7 : space.sm;

  const bg = outlined
    ? selected
      ? colors.tertiary
      : colors.chipIdle
    : selected
      ? colors.accentTint
      : colors.surfaceMuted;

  const border = outlined
    ? { borderWidth: 1, borderColor: selected ? colors.primary : colors.border }
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
            minHeight: compact ? 32 : 36,
            justifyContent: "center",
            opacity: state.pressed ? 0.72 : 1,
            ...border,
          },
          fromParent,
        ];
      }}
    >
      <TextCaption
        style={{
          color: textColor,
          fontFamily: fontFamilies.bodyMedium,
          fontWeight: "500",
          fontSize: 12,
          lineHeight: 16,
        }}
      >
        {title}
      </TextCaption>
    </Pressable>
  );
}
