import { ActivityIndicator, Pressable, type PressableProps, View } from "react-native";
import { colors, radii, space } from "@/src/theme/tokens";
import { TextBody } from "./TextBody";

type Props = PressableProps & {
  title: string;
  loading?: boolean;
};

export function ButtonPrimary({
  title,
  loading,
  disabled,
  style,
  ...rest
}: Props) {
  const isDisabled = disabled || loading;
  return (
    <Pressable
      accessibilityRole="button"
      disabled={isDisabled}
      style={(state) => {
        const fromParent =
          typeof style === "function" ? style(state) : style;
        return [
          {
            backgroundColor: colors.primary,
            paddingVertical: space.md,
            paddingHorizontal: space.xl,
            borderRadius: radii.md,
            alignItems: "center",
            justifyContent: "center",
            opacity: state.pressed ? 0.88 : isDisabled ? 0.45 : 1,
          },
          fromParent,
        ];
      }}
      {...rest}
    >
      {loading ? (
        <ActivityIndicator color={colors.white} />
      ) : (
        <TextBody style={{ color: colors.white, fontWeight: "600" }}>
          {title}
        </TextBody>
      )}
    </Pressable>
  );
}
