import { useCallback, useLayoutEffect } from "react";
import {
  ActivityIndicator,
  FlatList,
  Image,
  Pressable,
  RefreshControl,
  View,
} from "react-native";
import { router, useLocalSearchParams, useNavigation, useFocusEffect, type Href } from "expo-router";
import { Screen } from "@/src/components/ui/Screen";
import { TextTitle } from "@/src/components/ui/TextTitle";
import { TextBody } from "@/src/components/ui/TextBody";
import { TextCaption } from "@/src/components/ui/TextCaption";
import { AuctionCard } from "@/src/components/ui/AuctionCard";
import { ListEmptyState } from "@/src/components/ui/ListEmptyState";
import { useSellerCollectionDetail } from "@/src/data/seller-collections";
import { useScreenContentWidth } from "@/src/components/layout/content-width";
import { layout } from "@/src/theme/layout";
import { colors, radii, space } from "@/src/theme/tokens";

export default function PublicCollectionScreen() {
  const navigation = useNavigation();
  const params = useLocalSearchParams<{ id: string | string[] }>();
  const id =
    typeof params.id === "string" ? params.id : Array.isArray(params.id) ? (params.id[0] ?? "") : "";

  const screenW = useScreenContentWidth();
  const storeW = Math.min(screenW, layout.articleReadingMaxWidth);
  const gap = space.md;
  const paddingH = space.lg;
  const listInnerW = Math.max(0, storeW - paddingH * 2);
  const numColumns = listInnerW >= 480 ? 2 : 1;
  const colW = (listInnerW - gap * Math.max(0, numColumns - 1)) / Math.max(1, numColumns);
  const multiCol = numColumns > 1;

  const { data, isPending, isError, refetch, isRefetching } = useSellerCollectionDetail(id || undefined);

  useFocusEffect(
    useCallback(() => {
      void refetch();
    }, [refetch]),
  );

  const title = data?.name?.trim() || "Collection";

  useLayoutEffect(() => {
    navigation.setOptions({ title });
  }, [navigation, title]);

  const header = data ? (
    <View style={{ marginBottom: space.lg }}>
      {data.cover_url ? (
        <Image
          source={{ uri: data.cover_url }}
          style={{
            width: "100%",
            height: 180,
            borderRadius: radii.lg,
            marginBottom: space.md,
            backgroundColor: colors.surfaceMuted,
          }}
          resizeMode="cover"
        />
      ) : null}
      <TextTitle style={{ letterSpacing: -0.3 }}>{data.name}</TextTitle>
      {data.description.trim() ? (
        <TextBody style={{ marginTop: space.sm, color: colors.textSecondary, lineHeight: 22 }}>
          {data.description.trim()}
        </TextBody>
      ) : null}
      <Pressable
        onPress={() => router.push(`/seller/${data.seller_id}` as Href)}
        style={{ marginTop: space.md }}
        accessibilityRole="button"
        accessibilityLabel="View seller storefront"
      >
        <TextCaption style={{ fontWeight: "600", color: colors.primary }}>View seller →</TextCaption>
      </Pressable>
    </View>
  ) : null;

  const rows = data?.items ?? [];

  if (!id) {
    return (
      <Screen scroll>
        <TextBody>Invalid link.</TextBody>
      </Screen>
    );
  }

  if (isError) {
    return (
      <Screen scroll>
        <TextTitle>Collection</TextTitle>
        <TextBody style={{ marginTop: space.md }}>This collection is unavailable.</TextBody>
      </Screen>
    );
  }

  if (isPending && !data) {
    return (
      <Screen scroll>
        <ActivityIndicator color={colors.primary} style={{ marginTop: space.xl }} />
      </Screen>
    );
  }

  if (!data) {
    return (
      <Screen scroll>
        <TextTitle>Not found</TextTitle>
        <TextBody style={{ marginTop: space.md }}>This collection does not exist or is private.</TextBody>
      </Screen>
    );
  }

  const listEmpty =
    rows.length === 0 ? (
      <ListEmptyState
        icon="albums-outline"
        title="No public listings yet"
        description="The seller has not added visible listings to this collection."
      />
    ) : null;

  return (
    <Screen scroll={false} noPadding style={{ backgroundColor: colors.background }}>
      <View style={{ flex: 1, width: "100%", alignItems: "center" }}>
        <View style={{ flex: 1, width: "100%", maxWidth: layout.articleReadingMaxWidth }}>
          <FlatList
            showsVerticalScrollIndicator={false}
            data={rows}
            keyExtractor={(item) => item.id}
            key={`collection-${numColumns}`}
            numColumns={numColumns}
            columnWrapperStyle={multiCol ? { gap } : undefined}
            ListHeaderComponent={header}
            ListEmptyComponent={listEmpty}
            refreshControl={
              <RefreshControl refreshing={isRefetching} onRefresh={() => void refetch()} tintColor={colors.primary} />
            }
            contentContainerStyle={{
              flexGrow: 1,
              paddingHorizontal: paddingH,
              paddingTop: space.lg,
              paddingBottom: space.xxl,
            }}
            renderItem={({ item }) => (
              <View style={multiCol ? { width: colW, marginBottom: gap } : undefined}>
                <AuctionCard
                  auction={{
                    id: item.id,
                    title: item.title,
                    status: item.status,
                    ends_at: item.ends_at,
                    current_highest_bid: item.current_highest_bid,
                    starting_price: item.starting_price,
                    bid_count: item.bid_count,
                    image_url: item.image_url,
                    description: "",
                  }}
                  compact={multiCol}
                  inGrid={multiCol}
                  onPress={() => router.push(`/auction/${item.id}` as Href)}
                />
              </View>
            )}
          />
        </View>
      </View>
    </Screen>
  );
}
