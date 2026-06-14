import { Pressable, type PressableProps } from "react-native";
import { colors, goldBorderSubtle, radii, space } from "@/src/theme/tokens";
import { TextCaption } from "./TextCaption";

type Props = PressableProps & {
  title: string;
  selected?: boolean;
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
  style,
  ...rest
}: Props) {
  const outlined = appearance === "outlined";

  const bg = outlined
    ? selected
      ? colors.accentTint
      : colors.surfaceMuted
    : selected
      ? colors.accentTint
      : colors.surfaceMuted;

  const border = outlined
    ? {
        borderWidth: 1,
        borderColor: selected ? colors.accent : colors.border,
      }
    : selected
      ? { borderWidth: 1, borderColor: goldBorderSubtle }
      : { borderWidth: 1, borderColor: colors.border };

  const textColor = selected ? colors.accent : colors.text;

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
            paddingHorizontal: space.lg,
            paddingVertical: space.sm,
            borderRadius: radii.pill,
            backgroundColor: bg,
            opacity: state.pressed ? 0.85 : 1,
            ...border,
          },
          fromParent,
        ];
      }}
    >
      <TextCaption style={{ color: textColor, fontWeight: "600" }}>
        {title}
      </TextCaption>
    </Pressable>
  );
}
