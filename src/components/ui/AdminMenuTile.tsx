import { colors, radii, shadows, space } from "@/src/theme/tokens";
import { Ionicons } from "@expo/vector-icons";
import { Pressable, View } from "react-native";
import { TextBody } from "./TextBody";
import { TextCaption } from "./TextCaption";

type Props = {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  subtitle?: string;
  /** Icon circle background */
  tone?: "navy" | "lime" | "blue" | "coral";
  onPress: () => void;
};

const toneBg: Record<NonNullable<Props["tone"]>, string> = {
  navy: colors.surfaceStats,
  lime: colors.accentMuted,
  blue: colors.tertiaryMuted,
  coral: "rgba(232,85,85,0.12)",
};

const toneIcon: Record<NonNullable<Props["tone"]>, string> = {
  navy: colors.accent,
  lime: colors.accent,
  blue: colors.textMuted,
  coral: colors.danger,
};

export function AdminMenuTile({
  icon,
  title,
  subtitle,
  tone = "navy",
  onPress,
}: Props) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={subtitle ? `${title}. ${subtitle}` : title}
      android_ripple={{ color: "rgba(0,113,227,0.1)" }}
      style={({ pressed }) => ({
        width: "48%",
        marginBottom: space.md,
        borderRadius: radii.md,
        borderWidth: 1,
        borderColor: colors.border,
        backgroundColor: colors.surfaceMuted,
        padding: space.lg,
        opacity: pressed ? 0.92 : 1,
        ...shadows.card,
      })}
    >
      <View
        style={{
          width: 48,
          height: 48,
          borderRadius: radii.md,
          backgroundColor: toneBg[tone],
          alignItems: "center",
          justifyContent: "center",
          marginBottom: space.md,
        }}
      >
        <Ionicons name={icon} size={26} color={toneIcon[tone]} />
      </View>
      <TextBody
        style={{ fontWeight: "600", fontSize: 16, color: colors.text }}
        numberOfLines={2}
      >
        {title}
      </TextBody>
      {subtitle ? (
        <TextCaption style={{ marginTop: space.xs }} numberOfLines={2}>
          {subtitle}
        </TextCaption>
      ) : null}
    </Pressable>
  );
}
