import { useScreenContentWidth } from "@/src/components/layout/content-width";
import type { AuctionCardAuction } from "@/src/components/ui/AuctionCard";
import { AuctionCard } from "@/src/components/ui/AuctionCard";
import { HeaderLogoRow } from "@/src/components/ui/HeaderLogoRow";
import { resolveTabRouteSeo, SiteSeoHead } from "@/src/components/web/SiteSeoHead";
import { HomeFeaturedArticles } from "@/src/components/ui/HomeFeaturedArticles";
import { HomeFeaturedCarousel } from "@/src/components/ui/HomeFeaturedCarousel";
import { HomeMarketingFooter } from "@/src/components/ui/HomeMarketingFooter";
import { HomeTopSellers } from "@/src/components/ui/HomeTopSellers";
import { ListEmptyState } from "@/src/components/ui/ListEmptyState";
import { Screen } from "@/src/components/ui/Screen";
import { SearchField } from "@/src/components/ui/SearchField";
import { TextSectionTitle } from "@/src/components/ui/TextSectionTitle";
import { useHomeCatalogSearch } from "@/src/context/HomeCatalogSearchContext";
import { useActiveAuctions, useCuratedCategories } from "@/src/data/auctions";
import { useHomeSearchAutocompleteCandidates } from "@/src/lib/use-home-search-autocomplete";
import { useWebWideTabHeader } from "@/src/lib/web-tabs-layout";
import { getTrendingGridColumns } from "@/src/theme/layout";
import { appleSpacing, colors, fontFamilies, space } from "@/src/theme/tokens";
import { Ionicons } from "@expo/vector-icons";
import { router, useFocusEffect } from "expo-router";
import { useCallback, useMemo } from "react";
import {
    ActivityIndicator,
    FlatList,
    Pressable,
    RefreshControl,
    Text,
    View,
} from "react-native";

function toCardAuction(
  item: AuctionCardAuction & {
    description?: string | null;
    item_condition_label?: string | null;
    listing_detail_chip_labels?: string[];
  },
): AuctionCardAuction {
  return {
    id: item.id,
    title: item.title,
    status: item.status,
    ends_at: item.ends_at,
    current_highest_bid: item.current_highest_bid,
    starting_price: item.starting_price,
    bid_count: item.bid_count,
    image_url: item.image_url ?? null,
    description: item.description ?? null,
    item_condition_label: item.item_condition_label ?? null,
    listing_detail_chip_labels: item.listing_detail_chip_labels ?? [],
  };
}

export default function HomeScreen() {
  const wideWebHeader = useWebWideTabHeader();
  const hideHomeLogoRow = process.env.EXPO_OS === "web" && wideWebHeader;
  const { search, setSearch } = useHomeCatalogSearch();

  const screenW = useScreenContentWidth();
  /** Pinterest masonry gutter — `{spacing.sm}` */
  const gap = space.sm;
  /** Screen horizontal padding + FlatList `contentContainerStyle` horizontal padding */
  const listInnerW = Math.max(0, screenW - space.lg * 4);
  const numColumns = getTrendingGridColumns(screenW);
  const multiCol = numColumns > 1;
  const colW =
    (listInnerW - gap * Math.max(0, numColumns - 1)) / Math.max(1, numColumns);

  const { data: curated } = useCuratedCategories();
  const filters = useMemo(
    () => ({
      search: search.trim() || undefined,
      curatedCategories: curated,
    }),
    [search, curated],
  );
  const { data: auctions, isLoading, isRefetching, refetch } = useActiveAuctions(filters);

  const searchAutocompleteCandidates = useHomeSearchAutocompleteCandidates();

  useFocusEffect(
    useCallback(() => {
      void refetch();
    }, [refetch]),
  );

  const featuredList = useMemo(
    () => (auctions ?? []).filter((a) => a.is_featured),
    [auctions],
  );
  const featuredIds = useMemo(() => new Set(featuredList.map((a) => a.id)), [featuredList]);
  const rest = useMemo(() => {
    if (!auctions?.length) return [];
    return auctions.filter((a) => !featuredIds.has(a.id));
  }, [auctions, featuredIds]);

  const trendingViewAllLabelStyle = {
    fontFamily: fontFamilies.bodySemiBold,
    fontWeight: "600" as const,
    fontSize: 12,
    letterSpacing: 0.8,
    color: colors.primary,
    textTransform: "uppercase" as const,
  };

  const header = (
    <>
      {!hideHomeLogoRow ? <HeaderLogoRow /> : null}
      {hideHomeLogoRow ? null : (
        <SearchField
          placeholder="Search"
          value={search}
          onChangeText={setSearch}
          suggestions={searchAutocompleteCandidates}
        />
      )}

      {featuredList.length ? (
        <View style={{ marginTop: space.lg }}>
          <HomeFeaturedCarousel
            auctions={featuredList as AuctionCardAuction[]}
            toCardAuction={toCardAuction}
          />
        </View>
      ) : null}

      <HomeFeaturedArticles />

      <HomeTopSellers columnWidth={colW} gap={gap} multiColumn={multiCol} />

      <View
        style={{
          marginTop: appleSpacing.section,
          marginBottom: space.xl,
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <TextSectionTitle>Trending Auctions</TextSectionTitle>
        <Pressable
          onPress={() => router.push("/(tabs)/explore")}
          hitSlop={12}
          accessibilityRole="button"
          accessibilityLabel="View all auctions"
        >
          <View style={{ flexDirection: "row", alignItems: "center" }}>
            <Text style={trendingViewAllLabelStyle}>VIEW ALL</Text>
            <Ionicons
              name="arrow-forward"
              size={14}
              color={colors.primary}
              style={{ marginLeft: 4 }}
            />
          </View>
        </Pressable>
      </View>
    </>
  );

  const listEmpty =
    isLoading && rest.length === 0 ? (
      <View style={{ paddingVertical: space.xxl, alignItems: "center" }}>
        <ActivityIndicator size="large" color={colors.accent} accessibilityLabel="Loading auctions" />
      </View>
    ) : !isLoading && rest.length === 0 ? (
      (auctions?.length ?? 0) === 0 ? (
        <ListEmptyState
          icon="hammer-outline"
          title="No live auctions yet"
          description="Clear your search or browse the full catalog."
          actionLabel="View all"
          onActionPress={() => router.push("/(tabs)/explore")}
        />
      ) : (
        <ListEmptyState
          icon="star-outline"
          title="Everything here is in Featured"
          description="Scroll up for featured auctions, or browse the full catalog."
          actionLabel="View all"
          onActionPress={() => router.push("/(tabs)/explore")}
        />
      )
    ) : null;

  const footer = (
    <View style={{ marginTop: space.lg }}>
      <HomeMarketingFooter />
    </View>
  );

  return (
    <>
      <SiteSeoHead {...resolveTabRouteSeo("/")} />
      <Screen scroll={false}>
      <FlatList
        showsVerticalScrollIndicator={false}
        showsHorizontalScrollIndicator={false}
        data={rest}
        keyExtractor={(item) => item.id}
        key={`trending-cols-${numColumns}`}
        numColumns={numColumns}
        ListHeaderComponent={header}
        ListFooterComponent={footer}
        ListEmptyComponent={listEmpty}
        keyboardDismissMode="on-drag"
        keyboardShouldPersistTaps="handled"
        refreshControl={
          <RefreshControl
            refreshing={isRefetching}
            onRefresh={() => void refetch()}
            tintColor={colors.accent}
          />
        }
        columnWrapperStyle={multiCol ? { gap } : undefined}
        contentContainerStyle={{
          flexGrow: 1,
          paddingHorizontal: space.lg,
          paddingBottom: space.xxl,
        }}
        renderItem={({ item }) => (
          <View style={multiCol ? { width: colW, marginBottom: gap } : undefined}>
            <AuctionCard
              auction={toCardAuction(item)}
              compact={multiCol}
              inGrid={multiCol}
              onPress={() => router.push(`/auction/${item.id}`)}
            />
          </View>
        )}
      />
    </Screen>
    </>
  );
}
