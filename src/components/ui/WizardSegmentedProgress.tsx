import { easingEnter } from "@/src/lib/ui-motion";
import { ScrollView } from "react-native";
import Animated, { FadeIn, useReducedMotion } from "react-native-reanimated";
import { TextCaption } from "./TextCaption";
import { colors, radii, space } from "@/src/theme/tokens";

type Props = {
  /** 0-based index of the active segment */
  currentIndex: number;
  labels: readonly string[];
};

/**
 * Horizontal mini-progress for a single wizard screen (e.g. create listing substeps).
 */
export function WizardSegmentedProgress({ currentIndex, labels }: Props) {
  const reducedMotion = useReducedMotion();
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={{
        flexDirection: "row",
        gap: space.sm,
        paddingVertical: space.xs,
        paddingBottom: space.md,
      }}
    >
      {labels.map((label, i) => {
        const active = i === currentIndex;
        const done = i < currentIndex;
        return (
          <Animated.View
            key={`${label}-${i}`}
            entering={
              reducedMotion
                ? FadeIn.duration(1)
                : FadeIn.duration(200)
                    .delay(Math.min(i * 34, 200))
                    .easing(easingEnter)
            }
            style={{
              paddingHorizontal: space.md,
              paddingVertical: space.sm,
              borderRadius: radii.pill,
              backgroundColor: active
                ? colors.accentMuted
                : done
                  ? colors.tertiaryMuted
                  : colors.surfaceMuted,
              borderWidth: active ? 1 : 0,
              borderColor: colors.accent,
            }}
          >
            <TextCaption
              numberOfLines={1}
              style={{
                fontWeight: active ? "600" : "500",
                color: active ? colors.primary : done ? colors.textSecondary : colors.textMuted,
              }}
            >
              {i + 1}. {label}
            </TextCaption>
          </Animated.View>
        );
      })}
    </ScrollView>
  );
}
