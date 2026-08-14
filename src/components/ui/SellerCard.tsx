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
    <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
      <TextBody
        style={{ flexShrink: 1, fontWeight: "600", fontSize: 14, lineHeight: 19, color: colors.text }}
        numberOfLines={1}
      >
        {displayName}
      </TextBody>
      <Ionicons name="checkmark-circle" size={14} color={colors.verifiedBadgeText} />
    </View>
  );

  return (
    <View style={{ marginTop: space.sm }}>
      <TextCaption
        style={{
          marginBottom: space.sm,
          fontWeight: "500",
          letterSpacing: 0.6,
          color: colors.textMuted,
          textTransform: "uppercase",
          fontSize: 10,
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
          paddingVertical: space.md,
          borderTopWidth: 1,
          borderBottomWidth: 1,
          borderColor: colors.hairlineSoft,
        }}
      >
        <View style={{ flexDirection: "row", alignItems: "center", gap: space.md, flex: 1, minWidth: 0 }}>
          <View
            style={{
              width: 40,
              height: 40,
              borderRadius: 20,
              overflow: "hidden",
              backgroundColor: colors.accentMuted,
              alignItems: "center",
              justifyContent: "center",
              borderWidth: 1,
              borderColor: colors.border,
            }}
          >
            {avatarUrl ? (
              <Image
                source={{ uri: avatarUrl }}
                style={{ width: 40, height: 40 }}
                resizeMode="cover"
                accessibilityIgnoresInvertColors
              />
            ) : (
              <TextBody style={{ fontWeight: "600", fontSize: 15, color: colors.primary }}>
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
              minHeight: 36,
              paddingHorizontal: space.md,
              paddingVertical: space.xs,
              borderRadius: radii.pill,
              backgroundColor: colors.secondaryContainer,
              opacity: pressed ? 0.85 : 1,
            })}
          >
            <TextCaption style={{ fontWeight: "600", color: colors.textSecondary, fontSize: 11 }}>
              Contact
            </TextCaption>
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}
