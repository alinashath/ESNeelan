import type { AuctionCardAuction } from "@/src/components/ui/AuctionCard";
import { AuctionCard } from "@/src/components/ui/AuctionCard";
import { HeaderLogoRow } from "@/src/components/ui/HeaderLogoRow";
import { resolveTabRouteSeo, SiteSeoHead } from "@/src/components/web/SiteSeoHead";
import { HomeFeaturedArticles } from "@/src/components/ui/HomeFeaturedArticles";
import { HomeFeaturedCarousel } from "@/src/components/ui/HomeFeaturedCarousel";
import { HomeMarketingFooter } from "@/src/components/ui/HomeMarketingFooter";
import { ListEmptyState } from "@/src/components/ui/ListEmptyState";
import { Screen } from "@/src/components/ui/Screen";
import { SearchField } from "@/src/components/ui/SearchField";
import { TextSectionTitle } from "@/src/components/ui/TextSectionTitle";
import { useHomeCatalogSearch } from "@/src/context/HomeCatalogSearchContext";
import { useActiveAuctions, useCuratedCategories } from "@/src/data/auctions";
import { useHomeSearchAutocompleteCandidates } from "@/src/lib/use-home-search-autocomplete";
import { useWebWideTabHeader } from "@/src/lib/web-tabs-layout";
import { appleSpacing, colors, fontFamilies, space } from "@/src/theme/tokens";
import { Ionicons } from "@expo/vector-icons";
import { router, useFocusEffect } from "expo-router";
import { useCallback, useMemo } from "react";
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
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
  const latest = useMemo(() => {
    if (!auctions?.length) return [];
    return auctions.filter((a) => !featuredIds.has(a.id)).slice(0, LATEST_LIMIT);
  }, [auctions, featuredIds]);

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
      <Screen
        scroll
        noPadding
        scrollProps={{
          keyboardDismissMode: "on-drag",
          keyboardShouldPersistTaps: "handled",
          refreshControl: (
            <RefreshControl
              refreshing={isRefetching}
              onRefresh={() => void refetch()}
              tintColor={colors.accent}
            />
          ),
          contentContainerStyle: {
            paddingTop: space.lg,
            paddingHorizontal: space.lg,
            paddingBottom: space.xxl,
          },
        }}
      >
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

        <View
          style={{
            marginTop: appleSpacing.section,
            marginBottom: space.md,
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <TextSectionTitle>Latest</TextSectionTitle>
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
        </View>

        {isLoading && latest.length === 0 ? (
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
        ) : (
          <ScrollView
            horizontal
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

        <View style={{ marginTop: space.lg }}>
          <HomeMarketingFooter />
        </View>
      </Screen>
    </>
  );
}
