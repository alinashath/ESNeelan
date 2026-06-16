import { Image, Platform, Pressable, StyleSheet, Text, View } from "react-native";
import type { RankedSellerRow } from "@/src/data/sellers";
import { accentWash, colors, fontFamilies, radii, space, typography } from "@/src/theme/tokens";
import { TextCaption } from "@/src/components/ui/TextCaption";

type Props = {
  seller: RankedSellerRow;
  onPress: () => void;
  /** Match `AuctionCard`: compact in multi-column home grid. */
  compact?: boolean;
  /** Match `AuctionCard`: no extra bottom margin when in grid row. */
  inGrid?: boolean;
};

/**
 * Seller tile sized like home **Trending** `AuctionCard` (160 / 200 image, same padding & chrome).
 */
export function SellerTrendingCard({ seller, onPress, compact, inGrid }: Props) {
  const label = (seller.display_name?.trim() || "Seller").trim();
  const initial = (label[0] ?? "?").toUpperCase();
  const imgH = compact ? 160 : 200;
  const padH = compact ? space.sm : space.xxxl;
  const padTop = compact ? space.sm : space.lg;
  const padBottom = compact ? space.md : space.xxl;
  const n = seller.active_listing_count;

  const imageBlock = (
    <View
      style={{
        width: "100%",
        height: imgH,
        borderRadius: radii.md,
        overflow: "hidden",
        borderWidth: StyleSheet.hairlineWidth,
        borderColor: colors.border,
        backgroundColor: colors.surfaceMuted,
      }}
    >
      {seller.avatar_url ? (
        <Image
          source={{ uri: seller.avatar_url }}
          style={{ width: "100%", height: "100%" }}
          resizeMode="cover"
          accessibilityIgnoresInvertColors
        />
      ) : (
        <View
          style={{
            width: "100%",
            height: "100%",
            backgroundColor: colors.chipIdle,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Text
            style={{
              fontFamily: fontFamilies.displayRegular,
              fontSize: compact ? 44 : 56,
              fontWeight: "400",
              color: colors.primary,
            }}
          >
            {initial}
          </Text>
        </View>
      )}
      <View
        style={{
          position: "absolute",
          top: space.sm,
          left: space.sm,
          backgroundColor: colors.primary,
          paddingHorizontal: space.md,
          paddingVertical: 6,
          borderRadius: radii.pill,
        }}
      >
        <Text
          style={{
            color: colors.onAccent,
            fontWeight: "400",
            fontSize: 10,
            letterSpacing: 0.8,
            fontFamily: fontFamilies.body,
          }}
        >
          SELLER
        </Text>
      </View>
    </View>
  );

  return (
    <View
      style={{
        borderRadius: radii.md,
        overflow: "visible",
        marginBottom: inGrid ? 0 : space.lg,
        backgroundColor: "transparent",
      }}
    >
      <Pressable
        onPress={onPress}
        accessibilityRole="button"
        accessibilityLabel={`${label}, seller. ${n} live listings.`}
        android_ripple={{ color: accentWash }}
        style={({ pressed }) => ({ opacity: pressed ? 0.96 : 1 })}
      >
        <View>{imageBlock}</View>
        <View
          style={{
            paddingHorizontal: padH,
            paddingTop: padTop,
            paddingBottom: padBottom,
          }}
        >
          <Text
            style={[
              typography.cardTitle,
              {
                fontSize: compact ? 15 : 17,
                lineHeight: compact ? 20 : 22,
                letterSpacing: Platform.OS === "web" ? -0.5 : -0.37,
                color: colors.primary,
                textDecorationLine: "underline",
                textDecorationColor: colors.primary,
              },
            ]}
            numberOfLines={2}
          >
            {label}
          </Text>

          <TextCaption
            style={{
              marginTop: space.xs,
              fontSize: 12,
              fontWeight: "400",
              letterSpacing: 0.2,
              color: colors.textMuted,
              fontFamily: fontFamilies.body,
            }}
          >
            Live listings
          </TextCaption>

          <View
            style={{
              marginTop: space.sm,
              flexDirection: "row",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <Text
              style={{
                fontSize: compact ? 15 : 17,
                fontWeight: "400",
                color: colors.text,
                fontFamily: fontFamilies.body,
              }}
            >
              {n}
            </Text>
            <Text
              style={{
                fontSize: compact ? 13 : 14,
                fontWeight: "400",
                color: colors.textSecondary,
                fontFamily: fontFamilies.body,
              }}
            >
              {n === 1 ? "auction" : "auctions"}
            </Text>
          </View>
        </View>
      </Pressable>
    </View>
  );
}
