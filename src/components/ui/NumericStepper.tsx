import { Pressable, View } from "react-native";
import { colors, radii, space } from "@/src/theme/tokens";
import { TextBody } from "./TextBody";

type Props = {
  value: number;
  min?: number;
  max?: number;
  step?: number;
  onChange: (n: number) => void;
  label?: string;
  format?: (n: number) => string;
};

export function NumericStepper({
  value,
  min = 1,
  max = Number.MAX_SAFE_INTEGER,
  step = 1,
  onChange,
  label,
  format,
}: Props) {
  const display = format ? format(value) : String(value);
  return (
    <View>
      {label ? (
        <TextBody style={{ marginBottom: space.sm, fontWeight: "600" }}>
          {label}
        </TextBody>
      ) : null}
      <View style={{ flexDirection: "row", alignItems: "center" }}>
        <Pressable
          onPress={() => onChange(Math.max(min, Math.min(max, value - step)))}
          style={{
            width: 44,
            height: 44,
            borderRadius: radii.sm,
            backgroundColor: colors.surfaceMuted,
            alignItems: "center",
            justifyContent: "center",
            borderWidth: 1,
            borderColor: colors.border,
          }}
        >
          <TextBody style={{ fontSize: 22, fontWeight: "600" }}>−</TextBody>
        </Pressable>
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
        <Pressable
          onPress={() => onChange(Math.max(min, Math.min(max, value + step)))}
          style={{
            width: 44,
            height: 44,
            borderRadius: radii.sm,
            backgroundColor: colors.surfaceMuted,
            alignItems: "center",
            justifyContent: "center",
            borderWidth: 1,
            borderColor: colors.border,
          }}
        >
          <TextBody style={{ fontSize: 22, fontWeight: "600" }}>+</TextBody>
        </Pressable>
      </View>
    </View>
  );
}
