import { Pressable, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { colors, radii, space } from "@/src/theme/tokens";
import { TextTitle } from "./TextTitle";
import { TextBody } from "./TextBody";

type Props = {
  icon?: keyof typeof Ionicons.glyphMap;
  title: string;
  description?: string;
  actionLabel?: string;
  onActionPress?: () => void;
};

/** Centered empty list / zero-results pattern — icon, hierarchy, optional recovery action. */
export function ListEmptyState({
  icon = "cube-outline",
  title,
  description,
  actionLabel,
  onActionPress,
}: Props) {
  return (
    <View
      style={{
        alignItems: "center",
        paddingVertical: space.xxl,
        paddingHorizontal: space.lg,
      }}
    >
      <View
        style={{
          width: 72,
          height: 72,
          borderRadius: 36,
          backgroundColor: colors.surfaceMuted,
          alignItems: "center",
          justifyContent: "center",
          marginBottom: space.lg,
        }}
      >
        <Ionicons name={icon} size={34} color={colors.textMuted} />
      </View>
      <TextTitle style={{ fontSize: 18, textAlign: "center", lineHeight: 24 }}>{title}</TextTitle>
      {description ? (
        <TextBody style={{ marginTop: space.sm, textAlign: "center", color: colors.textMuted, lineHeight: 22 }}>
          {description}
        </TextBody>
      ) : null}
      {actionLabel && onActionPress ? (
        <Pressable
          onPress={onActionPress}
          style={({ pressed }) => ({
            marginTop: space.lg,
            paddingVertical: space.md,
            paddingHorizontal: space.xl,
            borderRadius: radii.sm,
            borderWidth: 1.5,
            borderColor: colors.primary,
            backgroundColor: pressed ? colors.surfaceMuted : colors.background,
          })}
          accessibilityRole="button"
          accessibilityLabel={actionLabel}
        >
          <TextBody style={{ fontWeight: "600", color: colors.primary }}>{actionLabel}</TextBody>
        </Pressable>
      ) : null}
    </View>
  );
}
