import type { AuctionCardAuction } from "@/src/components/ui/AuctionCard";
import { AuctionCard } from "@/src/components/ui/AuctionCard";
import { Chip } from "@/src/components/ui/Chip";
import { ChipRow } from "@/src/components/ui/ChipRow";
import { HeaderLogoRow } from "@/src/components/ui/HeaderLogoRow";
import { resolveTabRouteSeo, SiteSeoHead } from "@/src/components/web/SiteSeoHead";
import { HomeFeaturedArticles } from "@/src/components/ui/HomeFeaturedArticles";
import { HomeFeaturedCarousel } from "@/src/components/ui/HomeFeaturedCarousel";
import { HomeMarketingFooter } from "@/src/components/ui/HomeMarketingFooter";
import { ListEmptyState } from "@/src/components/ui/ListEmptyState";
import { Screen } from "@/src/components/ui/Screen";
import { SearchField } from "@/src/components/ui/SearchField";
import { TextSectionTitle } from "@/src/components/ui/TextSectionTitle";
import { useScreenContentWidth } from "@/src/components/layout/content-width";
import { useHomeCatalogSearch } from "@/src/context/HomeCatalogSearchContext";
import {
  useActiveAuctions,
  useActiveCategoryRoots,
  useCuratedCategories,
} from "@/src/data/auctions";
import { useHomeSearchAutocompleteCandidates } from "@/src/lib/use-home-search-autocomplete";
import { useWebWideTabHeader } from "@/src/lib/web-tabs-layout";
import { getTrendingGridColumns } from "@/src/theme/layout";
import { appleSpacing, colors, fontFamilies, space } from "@/src/theme/tokens";
import { Ionicons } from "@expo/vector-icons";
import { router, useFocusEffect } from "expo-router";
import { useCallback, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

const LATEST_LIMIT = 10;
const LATEST_CARD_W = 160;

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
  const [categoryId, setCategoryId] = useState<string | null>(null);

  const screenW = useScreenContentWidth();
  const gap = space.sm;
  const numColumns = getTrendingGridColumns(screenW);
  const listInnerW = Math.max(0, screenW - space.lg * 2);
  const colW =
    (listInnerW - gap * Math.max(0, numColumns - 1)) / Math.max(1, numColumns);
  const multiCol = numColumns > 1;

  const { data: curated } = useCuratedCategories();
  const { data: activeRoots } = useActiveCategoryRoots(curated);
  const roots = activeRoots ?? [];

  const searchTrimmed = search.trim();
  const isSearching = searchTrimmed.length > 0;

  /** Autocomplete may insert a category name — treat exact match as category filter. */
  const categoryFromSearch = useMemo(() => {
    if (!isSearching) return null;
    const q = searchTrimmed.toLowerCase();
    return roots.find((r) => r.name.toLowerCase() === q) ?? null;
  }, [isSearching, searchTrimmed, roots]);

  const effectiveCategoryId = categoryFromSearch?.id ?? categoryId;

  const filters = useMemo(
    () => ({
      // Exact category-name search is handled via categoryId, not title ilike.
      search: categoryFromSearch ? undefined : searchTrimmed || undefined,
      categoryId: curated != null ? (effectiveCategoryId ?? undefined) : undefined,
      curatedCategories: curated,
    }),
    [searchTrimmed, categoryFromSearch, effectiveCategoryId, curated],
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

  const latest = useMemo(() => {
    if (!auctions?.length) return [];
    return auctions.filter((a) => !featuredIds.has(a.id)).slice(0, LATEST_LIMIT);
  }, [auctions, featuredIds]);

  /** While searching: every match (including featured). Idle: Latest rail only. */
  const searchResults = useMemo(() => {
    if (!isSearching) return [];
    return auctions ?? [];
  }, [isSearching, auctions]);

  const latestViewAllLabelStyle = {
    fontFamily: fontFamilies.bodySemiBold,
    fontWeight: "600" as const,
    fontSize: 12,
    letterSpacing: 0.8,
    color: colors.primary,
    textTransform: "uppercase" as const,
  };

  return (
    <>
      <SiteSeoHead {...resolveTabRouteSeo("/")} />
      <Screen scroll={false} noPadding>
        <View style={styles.stickyChrome}>
          {!hideHomeLogoRow ? <HeaderLogoRow /> : null}
          {hideHomeLogoRow ? null : (
            <SearchField
              placeholder="Search"
              value={search}
              onChangeText={setSearch}
              suggestions={searchAutocompleteCandidates}
            />
          )}
          {roots.length ? (
            <View style={{ marginTop: hideHomeLogoRow ? 0 : space.md }}>
              <ChipRow dense>
                <Chip
                  title="All"
                  appearance="outlined"
                  compact
                  selected={effectiveCategoryId == null}
                  onPress={() => {
                    setCategoryId(null);
                    if (categoryFromSearch) setSearch("");
                  }}
                />
                {roots.map((c) => (
                  <Chip
                    key={c.id}
                    title={c.name}
                    appearance="outlined"
                    compact
                    selected={effectiveCategoryId === c.id}
                    onPress={() => {
                      setCategoryId(c.id);
                      // Clear a typed category-name query so the chip owns the filter.
                      if (categoryFromSearch) setSearch("");
                    }}
                  />
                ))}
                <Chip
                  title="All categories"
                  appearance="outlined"
                  compact
                  onPress={() => router.push("/categories")}
                />
              </ChipRow>
            </View>
          ) : (
            <View style={{ marginTop: hideHomeLogoRow ? 0 : space.md }}>
              <Chip
                title="Browse categories"
                appearance="outlined"
                compact
                onPress={() => router.push("/categories")}
              />
            </View>
          )}
        </View>

        <ScrollView
          style={{ flex: 1 }}
          keyboardDismissMode="on-drag"
          keyboardShouldPersistTaps="handled"
          nestedScrollEnabled
          showsVerticalScrollIndicator={false}
          showsHorizontalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={isRefetching}
              onRefresh={() => void refetch()}
              tintColor={colors.accent}
            />
          }
          contentContainerStyle={{
            paddingTop: space.md,
            paddingHorizontal: space.lg,
            paddingBottom: space.xxl,
            flexGrow: 1,
          }}
        >
          {!isSearching && featuredList.length ? (
            <View style={{ marginTop: space.sm }}>
              <HomeFeaturedCarousel
                auctions={featuredList as AuctionCardAuction[]}
                toCardAuction={toCardAuction}
              />
            </View>
          ) : null}

          {!isSearching && Platform.OS === "web" ? (
            <View style={{ marginHorizontal: -space.lg }}>
              <HomeFeaturedArticles />
            </View>
          ) : null}

          <View
            style={{
              marginTop: isSearching ? space.sm : appleSpacing.section,
              marginBottom: space.md,
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <TextSectionTitle>{isSearching ? "Results" : "Latest"}</TextSectionTitle>
            {!isSearching ? (
              <Pressable
                onPress={() => router.push("/(tabs)/explore")}
                hitSlop={12}
                accessibilityRole="button"
                accessibilityLabel="View all auctions"
              >
                <View style={{ flexDirection: "row", alignItems: "center" }}>
                  <Text style={latestViewAllLabelStyle}>VIEW ALL</Text>
                  <Ionicons
                    name="arrow-forward"
                    size={14}
                    color={colors.primary}
                    style={{ marginLeft: 4 }}
                  />
                </View>
              </Pressable>
            ) : null}
          </View>

          {isSearching ? (
            isLoading && searchResults.length === 0 ? (
              <View style={{ paddingVertical: space.xxl, alignItems: "center" }}>
                <ActivityIndicator
                  size="large"
                  color={colors.accent}
                  accessibilityLabel="Loading search results"
                />
              </View>
            ) : !isLoading && searchResults.length === 0 ? (
              <ListEmptyState
                icon="search-outline"
                title="No matches for your search"
                description="Try another term, pick a category, or browse Explore."
                actionLabel="Clear search"
                onActionPress={() => setSearch("")}
              />
            ) : (
              <View
                style={{
                  flexDirection: "row",
                  flexWrap: "wrap",
                  gap,
                }}
              >
                {searchResults.map((item) => (
                  <View
                    key={item.id}
                    style={multiCol ? { width: colW } : { width: "100%", marginBottom: gap }}
                  >
                    <AuctionCard
                      auction={toCardAuction(item)}
                      compact={multiCol}
                      inGrid={multiCol}
                      onPress={() => router.push(`/auction/${item.id}`)}
                    />
                  </View>
                ))}
              </View>
            )
          ) : isLoading && latest.length === 0 ? (
            <View style={{ paddingVertical: space.xxl, alignItems: "center" }}>
              <ActivityIndicator
                size="large"
                color={colors.accent}
                accessibilityLabel="Loading auctions"
              />
            </View>
          ) : !isLoading && latest.length === 0 ? (
            (auctions?.length ?? 0) === 0 ? (
              <ListEmptyState
                icon="hammer-outline"
                title="No live auctions yet"
                description="Clear filters or browse the full catalog."
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
          ) : (
            <ScrollView
              horizontal
              nestedScrollEnabled
              showsHorizontalScrollIndicator={false}
              style={{ marginHorizontal: -space.lg }}
              contentContainerStyle={{
                paddingHorizontal: space.lg,
                gap: space.sm,
                paddingBottom: 4,
              }}
            >
              {latest.map((item) => (
                <View key={item.id} style={{ width: LATEST_CARD_W }}>
                  <AuctionCard
                    auction={toCardAuction(item)}
                    compact
                    inGrid
                    onPress={() => router.push(`/auction/${item.id}`)}
                  />
                </View>
              ))}
            </ScrollView>
          )}

          {!isSearching ? (
            <View style={{ marginTop: space.lg }}>
              <HomeMarketingFooter />
            </View>
          ) : null}
        </ScrollView>
      </Screen>
    </>
  );
}

const styles = StyleSheet.create({
  stickyChrome: {
    paddingHorizontal: space.lg,
    paddingTop: space.lg,
    paddingBottom: space.sm,
    backgroundColor: colors.background,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
    zIndex: 2,
  },
});
