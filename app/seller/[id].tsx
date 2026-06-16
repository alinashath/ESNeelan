import { useLayoutEffect, useMemo, useState, useCallback } from "react";
import {
  ActivityIndicator,
  FlatList,
  Image,
  Pressable,
  RefreshControl,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams, useNavigation, useFocusEffect, type Href } from "expo-router";
import {
  useActiveCategoryRoots,
  useCuratedCategories,
  useExploreCatalog,
  useSellerPublicProfile,
} from "@/src/data/auctions";
import { useScreenContentWidth } from "@/src/components/layout/content-width";
import { layout } from "@/src/theme/layout";
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
import { Chip } from "@/src/components/ui/Chip";
import { ChipRow } from "@/src/components/ui/ChipRow";
import { accentWash, colors, radii, space } from "@/src/theme/tokens";

function sellerInitial(name: string) {
  const t = name.trim();
  return (t[0] ?? "?").toUpperCase();
}

export default function SellerStorefrontScreen() {
  const navigation = useNavigation();
  const params = useLocalSearchParams<{ id: string | string[] }>();
  const sellerId =
    typeof params.id === "string"
      ? params.id
      : Array.isArray(params.id)
        ? (params.id[0] ?? "")
        : "";

  const screenW = useScreenContentWidth();
  /** Match article reader column — centered, comfortable measure on large screens. */
  const storeW = Math.min(screenW, layout.articleReadingMaxWidth);
  const gap = space.md;
  const paddingH = space.lg;
  const listInnerW = Math.max(0, storeW - paddingH * 2);
  /** Storefront grid: up to two columns (more horizontal room per listing vs 3–4 col explore). */
  const numColumns = listInnerW >= 480 ? 2 : 1;
  const colW =
    (listInnerW - gap * Math.max(0, numColumns - 1)) / Math.max(1, numColumns);
  const multiCol = numColumns > 1;
  const wideHeader = storeW >= 560;

  const [filtersOpen, setFiltersOpen] = useState(false);
  const [applied, setApplied] = useState<ExploreFilterDraft>(exploreFiltersDefault);
  const [draft, setDraft] = useState<ExploreFilterDraft>(exploreFiltersDefault);

  const { data: curated } = useCuratedCategories();
  const { data: activeRoots } = useActiveCategoryRoots(curated);
  const roots = activeRoots ?? [];

  const {
    data: profile,
    isPending: profilePending,
    isError: profileError,
    refetch: refetchProfile,
  } = useSellerPublicProfile(sellerId);

  const catalogFilters = useMemo(
    () => ({
      sellerId: sellerId || undefined,
      categoryId: curated != null ? (applied.categoryId ?? undefined) : undefined,
      search: applied.search.trim() || undefined,
      listingScope: applied.listingScope,
      hasBids: applied.hasBids,
      curatedCategories: curated,
    }),
    [applied, curated, sellerId],
  );

  const { data: auctions, isLoading, isRefetching, refetch } =
    useExploreCatalog(catalogFilters);
  const rows = auctions ?? [];

  useFocusEffect(
    useCallback(() => {
      void refetch();
      void refetchProfile();
    }, [refetch, refetchProfile]),
  );

  const displayName = profile?.display_name?.trim() || "Seller";
  const ratingLabel =
    profile?.seller_rating_summary && profile.seller_rating_summary.count > 0
      ? `${profile.seller_rating_summary.avg.toFixed(1)} (${profile.seller_rating_summary.count})`
      : undefined;

  useLayoutEffect(() => {
    navigation.setOptions({
      title: displayName,
    });
  }, [navigation, displayName]);

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

  const avatarSize = wideHeader ? 80 : 56;
  const avatarRadius = avatarSize / 2;

  const header = (
    <View style={{ marginBottom: space.lg }}>
      <View
        style={{
          flexDirection: "row",
          alignItems: wideHeader ? "flex-start" : "center",
          gap: wideHeader ? space.lg : space.md,
        }}
      >
        <View
          style={{
            width: avatarSize,
            height: avatarSize,
            borderRadius: avatarRadius,
            overflow: "hidden",
            backgroundColor: colors.accentMuted,
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
          }}
        >
          {profilePending && !profile ? (
            <ActivityIndicator color={colors.primary} />
          ) : profile?.avatar_url ? (
            <Image
              source={{ uri: profile.avatar_url }}
              style={{ width: avatarSize, height: avatarSize }}
              resizeMode="cover"
              accessibilityIgnoresInvertColors
            />
          ) : (
            <TextTitle
              style={{
                fontSize: wideHeader ? 28 : 22,
                fontWeight: "500",
                color: colors.primary,
              }}
            >
              {sellerInitial(displayName)}
            </TextTitle>
          )}
        </View>
        <View style={{ flex: 1, minWidth: 0 }}>
          <TextTitle
            style={{ fontSize: wideHeader ? 26 : 22, letterSpacing: -0.4 }}
            numberOfLines={3}
          >
            {displayName}
          </TextTitle>
          {ratingLabel ? (
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                gap: 4,
                marginTop: 4,
              }}
            >
              <Ionicons name="star" size={15} color={colors.warning} />
              <TextCaption style={{ color: colors.textSecondary, fontWeight: "400" }}>
                {ratingLabel}
              </TextCaption>
            </View>
          ) : (
            <TextCaption style={{ marginTop: 4, color: colors.textMuted }}>
              No ratings yet
            </TextCaption>
          )}
          {wideHeader ? (
            <TextBody style={{ marginTop: space.md, color: colors.textMuted, lineHeight: 22 }}>
              Live and ended listings from this seller. Search or filter by category.
            </TextBody>
          ) : null}
        </View>
      </View>

      {!wideHeader ? (
        <TextBody style={{ marginTop: space.md, color: colors.textMuted }}>
          Live and ended listings from this seller. Search or filter by category.
        </TextBody>
      ) : null}

      <View
        style={{
          flexDirection: "row",
          justifyContent: "flex-end",
          alignItems: "center",
          marginTop: space.md,
        }}
      >
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
          <TextBody style={{ fontWeight: "500", fontSize: 13 }}>Filters</TextBody>
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
              <TextCaption style={{ fontSize: 10, fontWeight: "600", color: colors.onAccent }}>
                {activeFilterCount > 9 ? "9+" : String(activeFilterCount)}
              </TextCaption>
            </View>
          ) : null}
        </Pressable>
      </View>

      <View style={{ marginTop: space.md }}>
        <SearchField
          placeholder="Search this seller’s auctions…"
          value={applied.search}
          onChangeText={(t) => setApplied((prev) => ({ ...prev, search: t }))}
          accessibilityLabel="Search seller listings by title"
        />
      </View>

      {roots.length ? (
        <View style={{ marginTop: space.md }}>
          <ChipRow dense>
            <Chip
              title="All"
              appearance="outlined"
              compact
              selected={applied.categoryId === null}
              onPress={() =>
                setApplied((p) => ({
                  ...p,
                  categoryId: null,
                }))
              }
            />
            {roots.map((c) => (
              <Chip
                key={c.id}
                title={c.name}
                appearance="outlined"
                compact
                selected={applied.categoryId === c.id}
                onPress={() =>
                  setApplied((p) => ({
                    ...p,
                    categoryId: c.id,
                  }))
                }
              />
            ))}
          </ChipRow>
        </View>
      ) : null}
    </View>
  );

  const listEmpty =
    profileError ? (
      <ListEmptyState
        icon="alert-circle-outline"
        title="Could not load seller"
        description="Try again in a moment."
        actionLabel="Retry"
        onActionPress={() => void refetchProfile()}
      />
    ) : isLoading && rows.length === 0 ? (
      <View style={{ paddingVertical: space.xxl, alignItems: "center" }}>
        <ActivityIndicator size="large" color={colors.primary} accessibilityLabel="Loading" />
      </View>
    ) : !isLoading && rows.length === 0 ? (
      <ListEmptyState
        icon="hammer-outline"
        title={
          applied.search.trim()
            ? "No matches"
            : applied.categoryId
              ? "Nothing in this category"
              : "No listings to show"
        }
        description="Try another category, clear search, or adjust filters."
        actionLabel="Clear filters"
        onActionPress={clearAllFilters}
      />
    ) : null;

  if (!sellerId) {
    return (
      <Screen scroll>
        <TextBody>Invalid seller link.</TextBody>
      </Screen>
    );
  }

  return (
    <Screen scroll={false} noPadding style={{ backgroundColor: colors.background }}>
      <ExploreFiltersModal
        visible={filtersOpen}
        onClose={() => setFiltersOpen(false)}
        draft={draft}
        onChangeDraft={setDraft}
        onApply={applyFilters}
        onClear={clearAllFilters}
        roots={roots}
      />
      <View
        style={{
          flex: 1,
          width: "100%",
          alignItems: "center",
        }}
      >
        <View
          style={{
            flex: 1,
            width: "100%",
            maxWidth: layout.articleReadingMaxWidth,
          }}
        >
          <FlatList
            showsVerticalScrollIndicator={false}
            showsHorizontalScrollIndicator={false}
            data={rows}
            keyExtractor={(item) => item.id}
            key={`seller-auctions-${numColumns}`}
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
                    description: item.description,
                    item_condition_label: item.item_condition_label,
                    listing_detail_chip_labels: item.listing_detail_chip_labels,
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
