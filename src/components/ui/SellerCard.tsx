import { View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { colors, radii, space } from "@/src/theme/tokens";
import { TextBody } from "./TextBody";
import { TextCaption } from "./TextCaption";
import { ButtonSecondary } from "./ButtonSecondary";

type Props = {
  displayName: string;
  onMessagePress?: () => void;
  onProfilePress?: () => void;
  /** e.g. "4.9 (128)" — omit to hide rating row */
  ratingLabel?: string;
};

export function SellerCard({
  displayName,
  onMessagePress,
  onProfilePress,
  ratingLabel,
}: Props) {
  const initial = (displayName.trim()[0] ?? "?").toUpperCase();
  return (
    <View style={{ marginTop: space.sm }}>
      <TextCaption
        style={{
          marginBottom: space.md,
          fontWeight: "600",
          letterSpacing: 1.2,
          color: colors.textMuted,
        }}
      >
        SELLER INFORMATION
      </TextCaption>
      <View style={{ flexDirection: "row", alignItems: "center", gap: space.md }}>
        <View
          style={{
            width: 56,
            height: 56,
            borderRadius: 28,
            backgroundColor: colors.accent,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <TextBody style={{ fontWeight: "600", fontSize: 22, color: colors.primary }}>
            {initial}
          </TextBody>
        </View>
        <View style={{ flex: 1 }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
            <TextBody style={{ fontWeight: "600", fontSize: 18 }}>{displayName}</TextBody>
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                gap: 4,
                backgroundColor: colors.tertiaryMuted,
                paddingHorizontal: space.sm,
                paddingVertical: 4,
                borderRadius: radii.xs,
              }}
            >
              <Ionicons name="checkmark-circle" size={14} color={colors.secondary} />
              <TextCaption style={{ fontWeight: "600", color: colors.primary, fontSize: 11 }}>
                VERIFIED
              </TextCaption>
            </View>
          </View>
          {ratingLabel ? (
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                gap: 4,
                marginTop: 4,
              }}
            >
              <Ionicons name="star" size={16} color={colors.warning} />
              <TextCaption style={{ fontWeight: "600", color: colors.textSecondary }}>
                {ratingLabel}
              </TextCaption>
            </View>
          ) : null}
        </View>
      </View>
      <View
        style={{
          flexDirection: "row",
          gap: space.md,
          marginTop: space.lg,
        }}
      >
        {onMessagePress ? (
          <View style={{ flex: 1 }}>
            <ButtonSecondary title="MESSAGE" onPress={onMessagePress} />
          </View>
        ) : null}
        {onProfilePress ? (
          <View style={{ flex: 1 }}>
            <ButtonSecondary title="PROFILE" onPress={onProfilePress} />
          </View>
        ) : null}
      </View>
    </View>
  );
}
