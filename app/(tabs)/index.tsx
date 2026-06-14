import { useMemo, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  View,
} from "react-native";
import { router } from "expo-router";
import {
  useActiveAuctions,
  useActiveCategoryRoots,
  useCuratedCategories,
} from "@/src/data/auctions";
import { Screen } from "@/src/components/ui/Screen";
import { HeaderLogoRow } from "@/src/components/ui/HeaderLogoRow";
import { SearchField } from "@/src/components/ui/SearchField";
import { SearchQuickChips } from "@/src/components/ui/SearchQuickChips";
import { Chip } from "@/src/components/ui/Chip";
import { ChipRow } from "@/src/components/ui/ChipRow";
import { HomeFeaturedCarousel } from "@/src/components/ui/HomeFeaturedCarousel";
import { AuctionCard } from "@/src/components/ui/AuctionCard";
import { HomeStatsBar } from "@/src/components/ui/HomeStatsBar";
import { TextSectionTitle } from "@/src/components/ui/TextSectionTitle";
import { TextCaption } from "@/src/components/ui/TextCaption";
import { ListEmptyState } from "@/src/components/ui/ListEmptyState";
import { useScreenContentWidth } from "@/src/components/layout/content-width";
import { getTrendingGridColumns } from "@/src/theme/layout";
import { useWebWideTabHeader } from "@/src/lib/web-tabs-layout";
import { colors, space } from "@/src/theme/tokens";
import type { AuctionCardAuction } from "@/src/components/ui/AuctionCard";

function toCardAuction(
  item: AuctionCardAuction & { description?: string | null },
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
  };
}

export default function HomeScreen() {
  const wideWebHeader = useWebWideTabHeader();
  const hideHomeLogoRow = process.env.EXPO_OS === "web" && wideWebHeader;

  const screenW = useScreenContentWidth();
  const gap = space.md;
  /** Screen horizontal padding + FlatList `contentContainerStyle` horizontal padding */
  const listInnerW = Math.max(0, screenW - space.lg * 4);
  const numColumns = getTrendingGridColumns(screenW);
  const multiCol = numColumns > 1;
  const colW =
    (listInnerW - gap * Math.max(0, numColumns - 1)) / Math.max(1, numColumns);

  const [search, setSearch] = useState("");
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const { data: curated } = useCuratedCategories();
  const { data: activeRoots } = useActiveCategoryRoots(curated);
  const roots = activeRoots ?? [];
  const filters = useMemo(
    () => ({
      search: search.trim() || undefined,
      categoryId: curated != null ? (categoryId ?? undefined) : undefined,
      curatedCategories: curated,
    }),
    [search, categoryId, curated],
  );
  const { data: auctions, isLoading, isRefetching, refetch } = useActiveAuctions(filters);

  const featuredList = useMemo(
    () => (auctions ?? []).filter((a) => a.is_featured),
    [auctions],
  );
  const featuredIds = useMemo(() => new Set(featuredList.map((a) => a.id)), [featuredList]);
  const rest = useMemo(() => {
    if (!auctions?.length) return [];
    return auctions.filter((a) => !featuredIds.has(a.id));
  }, [auctions, featuredIds]);

  const header = (
    <>
      {!hideHomeLogoRow ? <HeaderLogoRow /> : null}
      <SearchField
        placeholder="Search auctions..."
        value={search}
        onChangeText={setSearch}
      />
      <SearchQuickChips
        suggestions={["Phone", "Watch", "Art", "Home"]}
        onPick={(term) => setSearch(term)}
      />
      <View style={{ marginTop: space.lg }}>
        <ChipRow>
          <Chip
            title="ALL"
            appearance="outlined"
            selected={categoryId === null}
            onPress={() => setCategoryId(null)}
          />
          {roots.map((c) => (
            <Chip
              key={c.id}
              title={c.name.toUpperCase()}
              appearance="outlined"
              selected={categoryId === c.id}
              onPress={() => setCategoryId(c.id)}
            />
          ))}
        </ChipRow>
      </View>

      {featuredList.length ? (
        <HomeFeaturedCarousel
          auctions={featuredList as AuctionCardAuction[]}
          toCardAuction={toCardAuction}
        />
      ) : null}

      <View
        style={{
          marginTop: space.xxxl,
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <TextSectionTitle style={{ marginBottom: 0 }}>Trending Auctions</TextSectionTitle>
        <Pressable
          onPress={() => router.push("/(tabs)/explore")}
          hitSlop={12}
          accessibilityRole="button"
          accessibilityLabel="View all auctions"
        >
          <TextCaption style={{ fontWeight: "600", letterSpacing: 1, color: colors.primary }}>
            VIEW ALL →
          </TextCaption>
        </Pressable>
      </View>
    </>
  );

  const listEmpty =
    isLoading && rest.length === 0 ? (
      <View style={{ paddingVertical: space.xxl, alignItems: "center" }}>
        <ActivityIndicator size="large" color={colors.primary} accessibilityLabel="Loading auctions" />
      </View>
    ) : !isLoading && rest.length === 0 ? (
      (auctions?.length ?? 0) === 0 ? (
        <ListEmptyState
          icon="hammer-outline"
          title="No live auctions yet"
          description="Try another category, clear your search, or check Explore for the full catalog."
          actionLabel="Browse Explore"
          onActionPress={() => router.push("/(tabs)/explore")}
        />
      ) : (
        <ListEmptyState
          icon="star-outline"
          title="Everything here is in Featured"
          description="Scroll up for featured auctions, or open Explore for the full catalog."
          actionLabel="Open Explore"
          onActionPress={() => router.push("/(tabs)/explore")}
        />
      )
    ) : null;

  const footer = (
    <View style={{ marginTop: space.lg }}>
      <HomeStatsBar />
    </View>
  );

  return (
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
        refreshControl={
          <RefreshControl
            refreshing={isRefetching}
            onRefresh={() => void refetch()}
            tintColor={colors.primary}
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
  );
}
