import { View } from "react-native";
import { TextCaption } from "./TextCaption";
import { colors, radii, space } from "@/src/theme/tokens";

type Props = {
  currentStep: number;
  totalSteps: number;
  labels: string[];
};

export function StepIndicator({ currentStep, totalSteps, labels }: Props) {
  return (
    <View style={{ marginBottom: space.lg }}>
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
        {Array.from({ length: totalSteps }, (_, i) => {
          const step = i + 1;
          const done = step < currentStep;
          const active = step === currentStep;
          return (
            <View key={step} style={{ flex: 1, alignItems: "center" }}>
              <View
                style={{
                  width: 28,
                  height: 28,
                  borderRadius: 14,
                  borderWidth: 2,
                  borderColor: done || active ? colors.accent : colors.border,
                  backgroundColor: done
                    ? colors.accent
                    : active
                      ? colors.accentTint
                      : colors.background,
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <TextCaption
                  style={{
                    fontWeight: "600",
                    color: done ? colors.onAccent : colors.text,
                  }}
                >
                  {step}
                </TextCaption>
              </View>
            </View>
          );
        })}
      </View>
      <View style={{ flexDirection: "row", marginTop: space.sm, justifyContent: "space-between" }}>
        {labels.slice(0, totalSteps).map((label, i) => (
          <View key={label} style={{ flex: 1, alignItems: "center" }}>
            <TextCaption
              numberOfLines={2}
              style={{
                textAlign: "center",
                fontWeight: i + 1 === currentStep ? "600" : "500",
                color: i + 1 === currentStep ? colors.accent : colors.textMuted,
                fontSize: 10,
              }}
            >
              {label}
            </TextCaption>
          </View>
        ))}
      </View>
    </View>
  );
}
