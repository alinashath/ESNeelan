import { ActivityIndicator, Image, Pressable, Text, View } from "react-native";
import { router, type Href } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useAuctionEmbedById } from "@/src/data/auctions";
import { AuctionCard, type AuctionCardAuction } from "@/src/components/ui/AuctionCard";
import { TextBody } from "@/src/components/ui/TextBody";
import { TextCaption } from "@/src/components/ui/TextCaption";
import { ValueCurrency } from "@/src/components/ui/ValueCurrency";
import { useScreenContentWidth } from "@/src/components/layout/content-width";
import { isAuctionLiveForUi } from "@/src/lib/auction-live";
import { articleExploreEmbedCardWidth } from "@/src/lib/explore-grid-column-width";
import { colors, fontFamilies, radii, space } from "@/src/theme/tokens";

export type ArticleAuctionDisplay = "row" | "card" | "large_card" | "explore";

type Props = {
  auctionId: string;
  display: ArticleAuctionDisplay;
  /** Optional eyebrow above the listing (maps from block label in admin). */
  caption?: string | null;
};

export function FeaturedArticleAuctionEmbed({ auctionId, display, caption }: Props) {
  const { data: auction, isLoading } = useAuctionEmbedById(auctionId);
  const screenW = useScreenContentWidth();
  const exploreCardW = articleExploreEmbedCardWidth(screenW);

  const go = () => {
    router.push(`/auction/${auctionId}` as Href);
  };

  if (isLoading) {
    return (
      <View style={{ paddingVertical: space.lg, alignItems: "center" }}>
        <ActivityIndicator color={colors.accent} accessibilityLabel="Loading listing" />
      </View>
    );
  }

  if (!auction) {
    return (
      <View
        style={{
          borderWidth: 1,
          borderColor: colors.border,
          borderRadius: radii.md,
          padding: space.lg,
          backgroundColor: colors.surfaceSoft,
        }}
      >
        <TextBody style={{ color: colors.textMuted }}>
          This listing is not available or may be restricted.
        </TextBody>
      </View>
    );
  }

  return (
    <View>
      {caption?.trim() ? (
        <TextCaption
          style={{
            marginBottom: space.sm,
            color: colors.textMuted,
            fontFamily: fontFamilies.bodySemiBold,
            fontWeight: "600",
            letterSpacing: 0.6,
            textTransform: "uppercase",
            fontSize: 11,
          }}
        >
          {caption.trim()}
        </TextCaption>
      ) : null}
      {display === "row" ? (
        <ArticleAuctionRow auction={auction} onPress={go} />
      ) : display === "large_card" ? (
        <AuctionCard auction={auction} onPress={go} inGrid />
      ) : display === "explore" ? (
        <View style={{ width: exploreCardW, maxWidth: "100%", alignSelf: "flex-start" }}>
          <AuctionCard auction={auction} onPress={go} compact inGrid />
        </View>
      ) : (
        <AuctionCard auction={auction} onPress={go} compact inGrid />
      )}
    </View>
  );
}

function ArticleAuctionRow({
  auction,
  onPress,
}: {
  auction: AuctionCardAuction;
  onPress: () => void;
}) {
  const live = isAuctionLiveForUi(auction.status, auction.ends_at);
  const bid = auction.current_highest_bid ?? auction.starting_price;
  const statusLabel = live ? "Live" : String(auction.status).replace(/_/g, " ");

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${auction.title}. ${statusLabel}`}
      style={({ pressed }) => ({
        flexDirection: "row",
        alignItems: "center",
        gap: space.md,
        borderWidth: 1,
        borderColor: colors.border,
        borderRadius: radii.md,
        padding: space.md,
        backgroundColor: colors.background,
        opacity: pressed ? 0.92 : 1,
      })}
    >
      <View
        style={{
          width: 76,
          height: 76,
          borderRadius: radii.sm,
          overflow: "hidden",
          backgroundColor: colors.surfaceMuted,
          borderWidth: 1,
          borderColor: colors.border,
        }}
      >
        {auction.image_url ? (
          <Image source={{ uri: auction.image_url }} style={{ width: "100%", height: "100%" }} resizeMode="cover" />
        ) : null}
      </View>
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text
          numberOfLines={2}
          style={{
            fontFamily: fontFamilies.bodySemiBold,
            fontWeight: "600",
            fontSize: 15,
            lineHeight: 20,
            color: colors.text,
          }}
        >
          {auction.title}
        </Text>
        <View style={{ flexDirection: "row", alignItems: "center", gap: space.sm, marginTop: 6 }}>
          <TextCaption
            style={{
              color: live ? colors.success : colors.textMuted,
              fontWeight: "600",
              fontSize: 11,
              textTransform: "uppercase",
            }}
          >
            {statusLabel}
          </TextCaption>
        </View>
        <View style={{ marginTop: space.xs, flexDirection: "row", alignItems: "center", gap: space.sm }}>
          <ValueCurrency amount={bid} size="compact" layout="inline" amountFontWeight="600" />
          <TextCaption style={{ color: colors.textMuted }}>
            {auction.bid_count} {auction.bid_count === 1 ? "bid" : "bids"}
          </TextCaption>
        </View>
      </View>
      <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
    </Pressable>
  );
}
