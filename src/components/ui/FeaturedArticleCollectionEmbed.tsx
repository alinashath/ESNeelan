import {
  ActivityIndicator,
  Image,
  Pressable,
  Text,
  View,
} from "react-native";
import { router, type Href } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useSellerCollectionDetail, type CollectionAuctionBrief } from "@/src/data/seller-collections";
import { TextBody } from "@/src/components/ui/TextBody";
import { TextCaption } from "@/src/components/ui/TextCaption";
import { TextTitle } from "@/src/components/ui/TextTitle";
import { ValueCurrency } from "@/src/components/ui/ValueCurrency";
import { isAuctionLiveForUi } from "@/src/lib/auction-live";
import { colors, fontFamilies, radii, space, typography } from "@/src/theme/tokens";

const GALLERY_PREVIEW = 3;

type Props = {
  collectionId: string;
  /** Optional eyebrow (from block label). */
  caption?: string | null;
};

function GalleryTile({ item, onPress }: { item: CollectionAuctionBrief; onPress: () => void }) {
  const live = isAuctionLiveForUi(item.status, item.ends_at);
  const bid = item.current_highest_bid ?? item.starting_price;
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={item.title}
      style={({ pressed }) => ({
        flex: 1,
        minWidth: 0,
        opacity: pressed ? 0.9 : 1,
      })}
    >
      <View
        style={{
          width: "100%",
          aspectRatio: 1,
          borderRadius: radii.md,
          overflow: "hidden",
          backgroundColor: colors.surfaceMuted,
          borderWidth: 1,
          borderColor: colors.border,
        }}
      >
        {item.image_url ? (
          <Image source={{ uri: item.image_url }} style={{ width: "100%", height: "100%" }} resizeMode="cover" />
        ) : (
          <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
            <Ionicons name="image-outline" size={28} color={colors.textMuted} />
          </View>
        )}
      </View>
      <Text
        numberOfLines={2}
        style={{
          marginTop: space.xs,
          fontFamily: fontFamilies.bodySemiBold,
          fontWeight: "600",
          fontSize: 13,
          lineHeight: 17,
          color: colors.text,
        }}
      >
        {item.title}
      </Text>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginTop: 4, flexWrap: "wrap" }}>
        <TextCaption
          style={{
            fontSize: 10,
            fontWeight: "700",
            textTransform: "uppercase",
            color: live ? colors.success : colors.textMuted,
          }}
        >
          {live ? "Live" : String(item.status).replace(/_/g, " ")}
        </TextCaption>
        <ValueCurrency amount={bid} size="compact" layout="inline" amountFontWeight="600" />
      </View>
    </Pressable>
  );
}

export function FeaturedArticleCollectionEmbed({ collectionId, caption }: Props) {
  const id = collectionId.trim();
  const { data, isLoading } = useSellerCollectionDetail(id || undefined);

  const openCollection = () => {
    if (!id) return;
    router.push(`/collection/${id}` as Href);
  };

  const openAuction = (auctionId: string) => {
    router.push(`/auction/${auctionId}` as Href);
  };

  if (!id) return null;

  if (isLoading) {
    return (
      <View style={{ paddingVertical: space.lg, alignItems: "center" }}>
        <ActivityIndicator color={colors.accent} accessibilityLabel="Loading collection" />
      </View>
    );
  }

  if (!data) {
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
          This collection is not available or may be restricted.
        </TextBody>
      </View>
    );
  }

  const top = data.items.slice(0, GALLERY_PREVIEW);
  const moreCount = Math.max(0, data.items.length - GALLERY_PREVIEW);
  const heroUri = data.cover_url ?? top[0]?.image_url ?? null;

  return (
    <View
      style={{
        borderWidth: 1,
        borderColor: colors.border,
        borderRadius: radii.lg,
        overflow: "hidden",
        backgroundColor: colors.background,
      }}
    >
      {heroUri ? (
        <Image
          source={{ uri: heroUri }}
          style={{ width: "100%", height: 160, backgroundColor: colors.surfaceMuted }}
          resizeMode="cover"
        />
      ) : null}

      <View style={{ padding: space.lg }}>
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

        <Text style={{ ...typography.title, fontSize: 22, lineHeight: 28 }}>{data.name.trim() || "Collection"}</Text>

        {data.description.trim() ? (
          <TextBody style={{ marginTop: space.sm, lineHeight: 22, color: colors.textSecondary }}>
            {data.description.trim()}
          </TextBody>
        ) : null}

        <Pressable
          onPress={() => router.push(`/seller/${data.seller_id}` as Href)}
          style={{ marginTop: space.md, alignSelf: "flex-start" }}
          accessibilityRole="button"
          accessibilityLabel="View seller storefront"
        >
          <TextCaption style={{ fontWeight: "600", color: colors.primary }}>View seller →</TextCaption>
        </Pressable>

        {top.length ? (
          <>
            <TextTitle style={{ marginTop: space.lg, marginBottom: space.sm, fontSize: 16 }}>
              Featured from this collection
            </TextTitle>
            <View style={{ flexDirection: "row", gap: space.sm }}>
              {top.map((item) => (
                <GalleryTile key={item.id} item={item} onPress={() => openAuction(item.id)} />
              ))}
            </View>
          </>
        ) : (
          <TextBody style={{ marginTop: space.lg, color: colors.textMuted }}>No listings in this collection yet.</TextBody>
        )}

        <Pressable
          onPress={openCollection}
          accessibilityRole="button"
          accessibilityLabel="View full collection"
          style={({ pressed }) => ({
            marginTop: space.lg,
            flexDirection: "row",
            alignItems: "center",
            gap: space.xs,
            alignSelf: "flex-start",
            opacity: pressed ? 0.85 : 1,
          })}
        >
          <TextBody style={{ fontWeight: "700", color: colors.primary, fontSize: 15 }}>
            {moreCount > 0 ? `View more (${moreCount} more)` : "View collection"}
          </TextBody>
          <Ionicons name="chevron-forward" size={18} color={colors.primary} />
        </Pressable>
      </View>
    </View>
  );
}
