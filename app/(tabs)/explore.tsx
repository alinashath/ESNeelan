import { useMemo, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import {
  useExploreCatalog,
  useActiveCategoryRoots,
  useCuratedCategories,
} from "@/src/data/auctions";
import { useScreenContentWidth } from "@/src/components/layout/content-width";
import { getTrendingGridColumns } from "@/src/theme/layout";
import {
  ExploreFiltersModal,
  exploreFiltersDefault,
  type ExploreFilterDraft,
} from "@/src/components/ui/ExploreFiltersModal";
import { Screen } from "@/src/components/ui/Screen";
import { SearchField } from "@/src/components/ui/SearchField";
import { TextTitle } from "@/src/components/ui/TextTitle";
import { TextBody } from "@/src/components/ui/TextBody";
import { TextCaption } from "@/src/components/ui/TextCaption";
import { AuctionCard } from "@/src/components/ui/AuctionCard";
import { ListEmptyState } from "@/src/components/ui/ListEmptyState";
import { accentWash, colors, radii, space } from "@/src/theme/tokens";

export default function ExploreScreen() {
  const screenW = useScreenContentWidth();
  const gap = space.md;
  const numColumns = getTrendingGridColumns(screenW);
  const listInnerW = Math.max(0, screenW - space.lg * 4);
  const colW =
    (listInnerW - gap * Math.max(0, numColumns - 1)) / Math.max(1, numColumns);
  const multiCol = numColumns > 1;

  const [filtersOpen, setFiltersOpen] = useState(false);
  const [applied, setApplied] = useState<ExploreFilterDraft>(exploreFiltersDefault);
  const [draft, setDraft] = useState<ExploreFilterDraft>(exploreFiltersDefault);

  const { data: curated } = useCuratedCategories();
  const { data: activeRoots } = useActiveCategoryRoots(curated);
  const roots = activeRoots ?? [];

  const catalogFilters = useMemo(
    () => ({
      categoryId: curated != null ? (applied.categoryId ?? undefined) : undefined,
      search: applied.search.trim() || undefined,
      listingScope: applied.listingScope,
      hasBids: applied.hasBids,
      curatedCategories: curated,
    }),
    [applied, curated],
  );

  const { data: auctions, isLoading, isRefetching, refetch } = useExploreCatalog(catalogFilters);
  const rows = auctions ?? [];

  const openFilters = () => {
    setDraft(applied);
    setFiltersOpen(true);
  };

  const applyFilters = () => {
    setApplied(draft);
    setFiltersOpen(false);
  };

  const clearAllFilters = () => {
    setApplied(exploreFiltersDefault);
    setDraft(exploreFiltersDefault);
    setFiltersOpen(false);
  };

  const activeFilterCount = useMemo(() => {
    let n = 0;
    if (applied.categoryId != null) n += 1;
    if (applied.listingScope !== "all") n += 1;
    if (applied.hasBids !== "any") n += 1;
    return n;
  }, [applied]);

  const header = (
    <View style={{ marginBottom: space.lg }}>
      <View
        style={{
          flexDirection: "row",
          justifyContent: "space-between",
          alignItems: "flex-start",
          gap: space.md,
        }}
      >
        <View style={{ flex: 1, minWidth: 0 }}>
          <TextTitle style={{ fontSize: 26, letterSpacing: -0.5 }}>Explore</TextTitle>
          <TextBody style={{ marginTop: space.xs, color: colors.textMuted }}>
            Live auctions first, then ended. Refine with filters.
          </TextBody>
        </View>
        <Pressable
          onPress={openFilters}
          accessibilityRole="button"
          accessibilityLabel="Open filters"
          android_ripple={{ color: accentWash }}
          style={({ pressed }) => ({
            flexDirection: "row",
            alignItems: "center",
            gap: 6,
            minHeight: 44,
            paddingVertical: space.sm,
            paddingHorizontal: space.md,
            borderRadius: radii.sm,
            borderWidth: 1,
            borderColor: colors.primary,
            backgroundColor: pressed ? colors.surfaceMuted : colors.background,
          })}
        >
          <Ionicons name="options-outline" size={18} color={colors.primary} />
          <TextBody style={{ fontWeight: "600", fontSize: 13 }}>Filters</TextBody>
          {activeFilterCount > 0 ? (
            <View
              style={{
                minWidth: 18,
                height: 18,
                borderRadius: 9,
                paddingHorizontal: 5,
                backgroundColor: colors.accent,
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <TextCaption style={{ fontSize: 10, fontWeight: "900", color: colors.onAccent }}>
                {activeFilterCount > 9 ? "9+" : String(activeFilterCount)}
              </TextCaption>
            </View>
          ) : null}
        </Pressable>
      </View>

      <View style={{ marginTop: space.lg }}>
        <SearchField
          placeholder="Search auctions by title…"
          value={applied.search}
          onChangeText={(t) => setApplied((prev) => ({ ...prev, search: t }))}
          accessibilityLabel="Search explore catalog by title"
        />
        <TextCaption style={{ marginTop: space.sm, color: colors.textMuted }}>
          Category, listing status, and bids — use Filters.
        </TextCaption>
      </View>
    </View>
  );

  const listEmpty =
    isLoading && rows.length === 0 ? (
      <View style={{ paddingVertical: space.xxl, alignItems: "center" }}>
        <ActivityIndicator size="large" color={colors.primary} accessibilityLabel="Loading auctions" />
      </View>
    ) : !isLoading && rows.length === 0 ? (
      <ListEmptyState
        icon="compass-outline"
        title={
          applied.search.trim()
            ? "No matches for your search"
            : applied.categoryId
              ? "No auctions in this category"
              : "Nothing matches these filters"
        }
        description={
          applied.search.trim()
            ? "Try a shorter search or clear filters."
            : "Try Live & ended, All categories, or clear filters."
        }
        actionLabel="Clear filters"
        onActionPress={clearAllFilters}
      />
    ) : null;

  return (
    <Screen scroll={false}>
      <ExploreFiltersModal
        visible={filtersOpen}
        onClose={() => setFiltersOpen(false)}
        draft={draft}
        onChangeDraft={setDraft}
        onApply={applyFilters}
        onClear={clearAllFilters}
        roots={roots}
      />
      <FlatList
        showsVerticalScrollIndicator={false}
        showsHorizontalScrollIndicator={false}
        data={rows}
        keyExtractor={(item) => item.id}
        key={`explore-cols-${numColumns}`}
        numColumns={numColumns}
        columnWrapperStyle={multiCol ? { gap } : undefined}
        ListHeaderComponent={header}
        ListEmptyComponent={listEmpty}
        keyboardDismissMode="on-drag"
        refreshControl={
          <RefreshControl
            refreshing={isRefetching}
            onRefresh={() => void refetch()}
            tintColor={colors.primary}
          />
        }
        contentContainerStyle={{ flexGrow: 1, padding: space.lg, paddingBottom: space.xxl }}
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
                description: item.description,
              }}
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
