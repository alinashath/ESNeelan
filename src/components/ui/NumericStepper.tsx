import { colors, fontFamilies, radii, space } from "@/src/theme/tokens";
import { Ionicons } from "@expo/vector-icons";
import { Pressable, View } from "react-native";
import { TextBody } from "./TextBody";

type Props = {
  value: number;
  min?: number;
  max?: number;
  step?: number;
  onChange: (n: number) => void;
  label?: string;
  format?: (n: number) => string;
  /** Default: minus / plus row. `vertical`: amount with chevron up/down beside it. */
  layout?: "horizontal" | "vertical";
  disabled?: boolean;
  /** Horizontal: amount in bordered white field (auction sheet reference). */
  filledAmountField?: boolean;
};

const STEP_HIT = 44;

export function NumericStepper({
  value,
  min = 1,
  max = Number.MAX_SAFE_INTEGER,
  step = 1,
  onChange,
  label,
  format,
  layout = "horizontal",
  disabled = false,
  filledAmountField = false,
}: Props) {
  const display = format ? format(value) : String(value);
  const bumpDown = () => {
    if (disabled) return;
    onChange(Math.max(min, Math.min(max, value - step)));
  };
  const bumpUp = () => {
    if (disabled) return;
    onChange(Math.max(min, Math.min(max, value + step)));
  };

  const chevronBlock = (
    <View
      style={{
        borderRadius: radii.sm,
        borderWidth: 1,
        borderColor: colors.border,
        overflow: "hidden",
        opacity: disabled ? 0.45 : 1,
      }}
    >
      <Pressable
        onPress={bumpUp}
        disabled={disabled}
        accessibilityRole="button"
        accessibilityLabel="Increase amount"
        style={{
          width: STEP_HIT,
          height: STEP_HIT,
          backgroundColor: colors.surfaceMuted,
          alignItems: "center",
          justifyContent: "center",
          borderBottomWidth: 1,
          borderBottomColor: colors.border,
        }}
      >
        <Ionicons name="chevron-up" size={22} color={colors.text} />
      </Pressable>
      <Pressable
        onPress={bumpDown}
        disabled={disabled}
        accessibilityRole="button"
        accessibilityLabel="Decrease amount"
        style={{
          width: STEP_HIT,
          height: STEP_HIT,
          backgroundColor: colors.surfaceMuted,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Ionicons name="chevron-down" size={22} color={colors.text} />
      </Pressable>
    </View>
  );

  return (
    <View>
      {label ? (
        <TextBody style={{ marginBottom: space.sm, fontWeight: "400", fontSize: 15, color: colors.text }}>
          {label}
        </TextBody>
      ) : null}
      {layout === "vertical" ? (
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            gap: space.md,
            minHeight: STEP_HIT * 2,
          }}
        >
          <TextBody
            style={{
              flex: 1,
              minWidth: 0,
              textAlign: "left",
              fontWeight: "400",
              fontSize: 22,
              lineHeight: 28,
              fontFamily: fontFamilies.body,
              letterSpacing: -0.25,
              color: colors.text,
            }}
            numberOfLines={1}
            adjustsFontSizeToFit
            minimumFontScale={0.65}
          >
            {display}
          </TextBody>
          {chevronBlock}
        </View>
      ) : (
        <View
          style={{
            flexDirection: "row",
            alignItems: "stretch",
            gap: space.sm,
          }}
        >
          <Pressable
            onPress={bumpDown}
            disabled={disabled}
            style={{
              width: STEP_HIT,
              minHeight: STEP_HIT,
              borderRadius: radii.sm,
              backgroundColor: colors.surfaceMuted,
              alignItems: "center",
              justifyContent: "center",
              borderWidth: 1,
              borderColor: colors.border,
              opacity: disabled ? 0.45 : 1,
            }}
          >
            <TextBody style={{ fontSize: 22, fontWeight: "600" }}>−</TextBody>
          </Pressable>
          {filledAmountField ? (
            <View
              style={{
                flex: 1,
                minWidth: 0,
                minHeight: STEP_HIT,
                justifyContent: "center",
                backgroundColor: colors.background,
                borderWidth: 1,
                borderColor: colors.border,
                borderRadius: radii.sm,
                paddingHorizontal: space.md,
              }}
            >
              <TextBody
                numberOfLines={1}
                adjustsFontSizeToFit
                minimumFontScale={0.65}
                style={{
                  textAlign: "center",
                  fontWeight: "600",
                  fontSize: 18,
                  fontFamily: fontFamilies.body,
                  color: colors.text,
                }}
              >
                {display}
              </TextBody>
            </View>
          ) : (
            <TextBody
              style={{
                minWidth: 64,
                textAlign: "center",
                fontWeight: "600",
                fontSize: 18,
              }}
            >
              {display}
            </TextBody>
          )}
          <Pressable
            onPress={bumpUp}
            disabled={disabled}
            style={{
              width: STEP_HIT,
              minHeight: STEP_HIT,
              borderRadius: radii.sm,
              backgroundColor: colors.surfaceMuted,
              alignItems: "center",
              justifyContent: "center",
              borderWidth: 1,
              borderColor: colors.border,
              opacity: disabled ? 0.45 : 1,
            }}
          >
            <TextBody style={{ fontSize: 22, fontWeight: "600" }}>+</TextBody>
          </Pressable>
        </View>
      )}
    </View>
  );
}
