import {
  ActivityIndicator,
  Pressable,
  type PressableProps,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { colors, radii, space, buttonPrimaryPadding } from "@/src/theme/tokens";
import { TextBody } from "./TextBody";

type Props = PressableProps & {
  title: string;
  loading?: boolean;
  /** Optional Ionicons glyph name (shown before label). */
  icon?: keyof typeof Ionicons.glyphMap;
  /** `success` — reserve / confirmation (green). Default primary (Apple blue) CTA. */
  variant?: "primary" | "success";
};

export function ButtonPrimary({
  title,
  loading,
  disabled,
  style,
  icon,
  variant = "primary",
  ...rest
}: Props) {
  const isDisabled = disabled || loading;
  const bg = variant === "success" ? colors.secondary : colors.accent;
  const fg = colors.onAccent;
  return (
    <Pressable
      accessibilityRole="button"
      disabled={isDisabled}
      style={(state) => {
        const fromParent =
          typeof style === "function" ? style(state) : style;
        return [
          {
            backgroundColor: bg,
            ...buttonPrimaryPadding,
            borderRadius: radii.pill,
            alignItems: "center",
            justifyContent: "center",
            flexDirection: "row",
            gap: space.sm,
            opacity: state.pressed ? 0.88 : isDisabled ? 0.45 : 1,
          },
          fromParent,
        ];
      }}
      {...rest}
    >
      {loading ? (
        <ActivityIndicator color={fg} />
      ) : (
        <>
          {icon ? (
            <Ionicons name={icon} size={20} color={fg} />
          ) : null}
          <TextBody style={{ color: fg, fontWeight: "600" }}>
            {title}
          </TextBody>
        </>
      )}
    </Pressable>
  );
}
