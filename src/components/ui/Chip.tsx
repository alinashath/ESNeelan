import { Pressable, type PressableProps } from "react-native";
import { colors, radii, space } from "@/src/theme/tokens";
import { TextCaption } from "./TextCaption";

type Props = PressableProps & {
  title: string;
  selected?: boolean;
};

export function Chip({ title, selected, style, ...rest }: Props) {
  return (
    <Pressable
      style={(state) => {
        const fromParent =
          typeof style === "function" ? style(state) : style;
        return [
          {
            paddingHorizontal: space.lg,
            paddingVertical: space.sm,
            borderRadius: radii.pill,
            backgroundColor: selected ? colors.primary : colors.surfaceMuted,
            opacity: state.pressed ? 0.85 : 1,
          },
          fromParent,
        ];
      }}
      {...rest}
    >
      <TextCaption
        style={{
          color: selected ? colors.white : colors.text,
          fontWeight: "600",
        }}
      >
        {title}
      </TextCaption>
    </Pressable>
  );
}
