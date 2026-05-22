import { Pressable, View } from "react-native";
import { colors, radii, space } from "@/src/theme/tokens";
import { TextBody } from "./TextBody";

type Props = {
  value: number;
  min?: number;
  step?: number;
  onChange: (n: number) => void;
  label?: string;
};

export function NumericStepper({
  value,
  min = 1,
  step = 1,
  onChange,
  label,
}: Props) {
  return (
    <View>
      {label ? (
        <TextBody style={{ marginBottom: space.sm, fontWeight: "600" }}>
          {label}
        </TextBody>
      ) : null}
      <View style={{ flexDirection: "row", alignItems: "center" }}>
        <Pressable
          onPress={() => onChange(Math.max(min, value - step))}
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
            fontWeight: "700",
            fontSize: 18,
          }}
        >
          {value}
        </TextBody>
        <Pressable
          onPress={() => onChange(value + step)}
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
