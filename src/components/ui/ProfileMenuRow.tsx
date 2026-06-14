import { Pressable, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { colors, radii, space } from "@/src/theme/tokens";
import { TextBody } from "./TextBody";
import { TextCaption } from "./TextCaption";

type Props = {
  icon: keyof typeof Ionicons.glyphMap;
  iconTint?: string;
  iconBg?: string;
  title: string;
  subtitle?: string;
  onPress: () => void;
  destructive?: boolean;
};

/** Settings-style row — icon in pill, title, optional subtitle, chevron. */
export function ProfileMenuRow({
  icon,
  iconTint = colors.primary,
  iconBg = colors.surfaceMuted,
  title,
  subtitle,
  onPress,
  destructive,
}: Props) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={subtitle ? `${title}. ${subtitle}` : title}
      android_ripple={{ color: "rgba(0,113,227,0.08)" }}
      style={({ pressed }) => ({
        flexDirection: "row",
        alignItems: "center",
        paddingVertical: space.md,
        paddingHorizontal: space.md,
        borderRadius: radii.lg,
        backgroundColor: pressed ? colors.accentTint : colors.background,
        borderWidth: 1,
        borderColor: colors.border,
        marginBottom: space.sm,
        opacity: pressed ? 0.95 : 1,
      })}
    >
      <View
        style={{
          width: 44,
          height: 44,
          borderRadius: radii.md,
          backgroundColor: iconBg,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Ionicons name={icon} size={22} color={destructive ? colors.danger : iconTint} />
      </View>
      <View style={{ flex: 1, marginLeft: space.md, minWidth: 0 }}>
        <TextBody style={{ fontWeight: "600", color: destructive ? colors.danger : colors.text }}>
          {title}
        </TextBody>
        {subtitle ? (
          <TextCaption style={{ marginTop: 2 }} numberOfLines={2}>
            {subtitle}
          </TextCaption>
        ) : null}
      </View>
      <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
    </Pressable>
  );
}
