import { Image, Pressable, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { colors, radii, space } from "@/src/theme/tokens";
import { TextBody } from "./TextBody";
import { TextCaption } from "./TextCaption";

type Props = {
  displayName: string;
  /** Public avatars bucket URL; when missing, initials are shown. */
  avatarUrl?: string | null;
  onMessagePress?: () => void;
  /** Opens seller storefront (seller name is the primary control). */
  onSellerPress?: () => void;
  /** e.g. "4.2 (15)" from completed buyer feedback — omit to hide rating row */
  ratingLabel?: string;
};

export function SellerCard({
  displayName,
  avatarUrl,
  onMessagePress,
  onSellerPress,
  ratingLabel,
}: Props) {
  const initial = (displayName.trim()[0] ?? "?").toUpperCase();
  const nameEl = (
    <TextBody style={{ fontWeight: "600", fontSize: 16, color: colors.text }} numberOfLines={1}>
      {displayName}
    </TextBody>
  );

  return (
    <View style={{ marginTop: space.sm }}>
      <TextCaption
        style={{
          marginBottom: space.md,
          fontWeight: "500",
          letterSpacing: 0.6,
          color: colors.textMuted,
          textTransform: "uppercase",
          fontSize: 11,
        }}
      >
        Seller information
      </TextCaption>

      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          gap: space.md,
          paddingVertical: space.sm,
          paddingHorizontal: space.md,
          borderRadius: radii.pill,
          backgroundColor: colors.surfaceSoft,
          borderWidth: 1,
          borderColor: colors.hairlineSoft,
        }}
      >
        <View style={{ flexDirection: "row", alignItems: "center", gap: space.md, flex: 1, minWidth: 0 }}>
          <View
            style={{
              width: 48,
              height: 48,
              borderRadius: 24,
              overflow: "hidden",
              backgroundColor: colors.accentMuted,
              alignItems: "center",
              justifyContent: "center",
              borderWidth: 2,
              borderColor: colors.white,
            }}
          >
            {avatarUrl ? (
              <Image
                source={{ uri: avatarUrl }}
                style={{ width: 48, height: 48 }}
                resizeMode="cover"
                accessibilityIgnoresInvertColors
              />
            ) : (
              <TextBody style={{ fontWeight: "600", fontSize: 18, color: colors.primary }}>
                {initial}
              </TextBody>
            )}
          </View>
          <View style={{ flex: 1, minWidth: 0 }}>
            {onSellerPress ? (
              <Pressable
                onPress={onSellerPress}
                accessibilityRole="link"
                accessibilityLabel={`View ${displayName}'s profile and listings`}
                hitSlop={6}
              >
                {nameEl}
              </Pressable>
            ) : (
              nameEl
            )}
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                alignSelf: "flex-start",
                gap: 4,
                marginTop: 4,
                paddingHorizontal: 8,
                paddingVertical: 2,
                borderRadius: radii.pill,
                backgroundColor: colors.verifiedBadgeBg,
                borderWidth: 1,
                borderColor: colors.verifiedBadgeBorder,
              }}
            >
              <Ionicons name="checkmark-circle" size={11} color={colors.verifiedBadgeText} />
              <TextCaption
                style={{
                  fontWeight: "700",
                  color: colors.verifiedBadgeText,
                  fontSize: 10,
                  letterSpacing: 0.4,
                }}
              >
                VERIFIED
              </TextCaption>
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
                <Ionicons name="star" size={14} color={colors.warning} />
                <TextCaption style={{ fontWeight: "400", color: colors.textSecondary, fontSize: 12 }}>
                  {ratingLabel}
                </TextCaption>
              </View>
            ) : null}
          </View>
        </View>

        {onMessagePress ? (
          <Pressable
            onPress={onMessagePress}
            accessibilityRole="button"
            accessibilityLabel="Contact seller"
            style={({ pressed }) => ({
              paddingHorizontal: space.lg,
              paddingVertical: space.sm,
              borderRadius: radii.pill,
              backgroundColor: colors.secondaryContainer,
              opacity: pressed ? 0.85 : 1,
            })}
          >
            <TextCaption style={{ fontWeight: "700", color: colors.textSecondary, fontSize: 12 }}>
              Contact
            </TextCaption>
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}
