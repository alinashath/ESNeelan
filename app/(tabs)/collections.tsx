import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from "react-native";
import { ContainedListingPhoto } from "@/src/components/ui/ContainedListingPhoto";
import { router, useFocusEffect, type Href } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import {
  useCollectionsHub,
  type SellerCollectionRow,
} from "@/src/data/seller-collections";
import { Screen } from "@/src/components/ui/Screen";
import { resolveTabRouteSeo, SiteSeoHead } from "@/src/components/web/SiteSeoHead";
import { SearchField } from "@/src/components/ui/SearchField";
import { ListEmptyState } from "@/src/components/ui/ListEmptyState";
import { Badge } from "@/src/components/ui/Badge";
import { TextBody } from "@/src/components/ui/TextBody";
import { TextCaption } from "@/src/components/ui/TextCaption";
import { TextSectionTitle } from "@/src/components/ui/TextSectionTitle";
import { layout } from "@/src/theme/layout";
import { colors, fontFamilies, radii, space } from "@/src/theme/tokens";

const MORE_PAGE_SIZE = 8;
const TWO_COL_MIN_INNER = 420;

function openCollection(id: string) {
  router.push(`/collection/${id}` as Href);
}

function matchesSearch(item: SellerCollectionRow, q: string): boolean {
  const needle = q.trim().toLowerCase();
  if (!needle) return true;
  const hay = [item.name, item.description, item.seller_display_name ?? ""]
    .join(" ")
    .toLowerCase();
  return hay.includes(needle);
}

type CollectionCardProps = {
  item: SellerCollectionRow;
  layoutVariant: "grid" | "row";
  width?: number;
};

function CollectionCard({ item, layoutVariant, width }: CollectionCardProps) {
  const thumb =
    item.cover_url ? (
      <ContainedListingPhoto
        uri={item.cover_url}
        aspectRatio={layoutVariant === "grid" ? 4 / 3 : undefined}
        height={layoutVariant === "grid" ? undefined : 80}
        width={layoutVariant === "grid" ? "100%" : 112}
        borderRadius={layoutVariant === "grid" ? 0 : radii.md}
        showBorder={false}
      />
    ) : (
      <View
        style={
          layoutVariant === "grid"
            ? {
                width: "100%",
                aspectRatio: 4 / 3,
                borderRadius: 0,
                backgroundColor: colors.accentTint,
                alignItems: "center",
                justifyContent: "center",
              }
            : {
                width: 112,
                height: 80,
                borderRadius: radii.md,
                backgroundColor: colors.accentTint,
                alignItems: "center",
                justifyContent: "center",
              }
        }
      >
        <Ionicons name="albums-outline" size={layoutVariant === "grid" ? 32 : 28} color={colors.textMuted} />
      </View>
    );

  const textBlock = (
    <View
      style={{
        flex: 1,
        minWidth: 0,
        justifyContent: "center",
        ...(layoutVariant === "grid" ? { padding: space.md } : null),
      }}
    >
      {item.is_featured ? (
        <Badge title="FEATURED" variant="accent" compact style={{ marginBottom: space.xs }} />
      ) : null}
      <Text
        numberOfLines={layoutVariant === "grid" ? 2 : 2}
        style={{
          fontFamily: fontFamilies.headingSerif,
          fontSize: layoutVariant === "grid" ? 18 : 16,
          lineHeight: layoutVariant === "grid" ? 24 : 22,
          fontWeight: "400",
          color: colors.text,
        }}
      >
        {item.name}
      </Text>
      {item.description.trim() && layoutVariant === "grid" ? (
        <TextBody
          numberOfLines={2}
          style={{ marginTop: space.xs, color: colors.textSecondary, lineHeight: 20, fontSize: 14 }}
        >
          {item.description.trim()}
        </TextBody>
      ) : null}
    </View>
  );

  return (
    <Pressable
      onPress={() => openCollection(item.id)}
      accessibilityRole="button"
      accessibilityLabel={item.name}
      style={({ pressed }) => ({
        width: layoutVariant === "grid" ? width : "100%",
        flexDirection: layoutVariant === "grid" ? "column" : "row",
        gap: layoutVariant === "grid" ? 0 : space.md,
        borderWidth: StyleSheet.hairlineWidth,
        borderColor: colors.border,
        backgroundColor: colors.background,
        overflow: "hidden",
        opacity: pressed ? 0.94 : 1,
      })}
    >
      {thumb}
      {textBlock}
    </Pressable>
  );
}

export default function CollectionsScreen() {
  const { width: windowW } = useWindowDimensions();
  const { data, isLoading, isRefetching, refetch } = useCollectionsHub();
  const list: SellerCollectionRow[] = Array.isArray(data) ? data : [];
  const [search, setSearch] = useState("");
  const [morePage, setMorePage] = useState(1);

  const columnMax = layout.articleReadingMaxWidth;
  const innerW = Math.max(0, Math.min(windowW, columnMax) - space.lg * 2);
  const moreGap = space.md;
  const moreNumCols = innerW >= TWO_COL_MIN_INNER ? 2 : 1;
  const moreColW = moreNumCols === 2 ? (innerW - moreGap) / 2 : innerW;

  const searchTrim = search.trim();
  const hasSearch = searchTrim.length > 0;

  const filtered = useMemo(() => {
    if (!hasSearch) return list;
    return list.filter((item) => matchesSearch(item, searchTrim));
  }, [list, hasSearch, searchTrim]);

  const featured = useMemo(
    () => (hasSearch ? [] : filtered.filter((c) => c.is_featured)),
    [filtered, hasSearch],
  );
  const latestPool = useMemo(() => {
    if (hasSearch) return filtered;
    // Latest list: all collections by created_at (already featured-first in hub; re-sort for "latest")
    return [...filtered].sort((a, b) => String(b.created_at).localeCompare(String(a.created_at)));
  }, [filtered, hasSearch]);

  const hero = !hasSearch && featured.length > 0 ? featured[0]! : !hasSearch && latestPool[0] ? latestPool[0] : null;
  const restPool = useMemo(() => {
    if (hasSearch) return filtered;
    const exclude = new Set(featured.map((c) => c.id));
    if (hero?.id) exclude.add(hero.id);
    return latestPool.filter((c) => !exclude.has(c.id));
  }, [filtered, hasSearch, latestPool, featured, hero?.id]);

  useEffect(() => {
    setMorePage(1);
  }, [searchTrim, restPool.length]);

  const morePageCount = Math.max(1, Math.ceil(restPool.length / MORE_PAGE_SIZE));
  const paginatedRest = useMemo(() => {
    const start = (morePage - 1) * MORE_PAGE_SIZE;
    return restPool.slice(start, start + MORE_PAGE_SIZE);
  }, [restPool, morePage]);

  const showMorePagination = restPool.length > MORE_PAGE_SIZE;
  const featuredStrip = !hasSearch ? featured.filter((c) => c.id !== hero?.id) : [];

  useFocusEffect(
    useCallback(() => {
      void refetch();
    }, [refetch]),
  );

  const pageSeo = <SiteSeoHead {...resolveTabRouteSeo("/collections")} />;

  if (isLoading && list.length === 0) {
    return (
      <>
        {pageSeo}
        <Screen>
          <View style={{ flex: 1, alignItems: "center", justifyContent: "center", paddingVertical: space.xxl }}>
            <ActivityIndicator color={colors.accent} accessibilityLabel="Loading events" />
          </View>
        </Screen>
      </>
    );
  }

  if (!list.length) {
    return (
      <>
        {pageSeo}
        <Screen scroll>
          <View style={{ maxWidth: layout.articleReadingMaxWidth, alignSelf: "center", width: "100%" }}>
            <TextSectionTitle style={{ marginBottom: space.md }}>Events</TextSectionTitle>
            <ListEmptyState
              icon="albums-outline"
              title="No events yet"
              description="Curated events and listing groups will appear here."
            />
          </View>
        </Screen>
      </>
    );
  }

  return (
    <>
      {pageSeo}
      <Screen
        scroll
        noPadding
        scrollProps={{
          contentContainerStyle: { paddingBottom: space.xxl },
          refreshControl: (
            <RefreshControl
              refreshing={isRefetching && list.length > 0}
              onRefresh={() => void refetch()}
              tintColor={colors.accent}
            />
          ),
        }}
      >
        <View
          style={{
            width: "100%",
            maxWidth: layout.articleReadingMaxWidth,
            alignSelf: "center",
          }}
        >
          <View style={{ paddingHorizontal: space.lg, paddingTop: space.md, paddingBottom: space.sm }}>
            <TextSectionTitle>Events</TextSectionTitle>
          </View>

          <View style={{ paddingHorizontal: space.lg, marginBottom: space.md }}>
            <SearchField
              placeholder="Search"
              value={search}
              onChangeText={setSearch}
              showIdleSuggestions={false}
              accessibilityLabel="Search events"
            />
          </View>

          {hasSearch && filtered.length === 0 ? (
            <View style={{ paddingHorizontal: space.lg }}>
              <ListEmptyState
                icon="search-outline"
                title="No matches"
                description="Try a different event name."
                actionLabel="Clear search"
                onActionPress={() => setSearch("")}
              />
            </View>
          ) : null}

          {hero ? (
            <Pressable
              onPress={() => openCollection(hero.id)}
              accessibilityRole="button"
              accessibilityLabel={hero.is_featured ? `Featured: ${hero.name}` : `Latest: ${hero.name}`}
              style={({ pressed }) => ({ opacity: pressed ? 0.94 : 1 })}
            >
              {hero.cover_url ? (
                <ContainedListingPhoto
                  uri={hero.cover_url}
                  aspectRatio={16 / 9}
                  showBorder={false}
                  borderRadius={0}
                />
              ) : (
                <View
                  style={{
                    width: "100%",
                    aspectRatio: 16 / 9,
                    backgroundColor: colors.accentTint,
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Ionicons name="albums-outline" size={48} color={colors.primary} />
                </View>
              )}
              <View
                style={{
                  paddingHorizontal: space.lg,
                  paddingTop: space.md,
                  paddingBottom: space.lg,
                }}
              >
                <Text
                  style={{
                    fontSize: 11,
                    fontWeight: "700",
                    letterSpacing: 1.2,
                    color: colors.accent,
                    marginBottom: space.xs,
                  }}
                >
                  {hero.is_featured ? "FEATURED" : "LATEST"}
                </Text>
                <Text
                  style={{
                    fontFamily: fontFamilies.headingSerif,
                    fontSize: 26,
                    lineHeight: 32,
                    fontWeight: "400",
                    color: colors.text,
                  }}
                >
                  {hero.name}
                </Text>
                {hero.description.trim() ? (
                  <TextBody style={{ marginTop: space.md, lineHeight: 24, color: colors.textSecondary }}>
                    {hero.description.trim()}
                  </TextBody>
                ) : null}
                <View style={{ marginTop: space.md, flexDirection: "row", alignItems: "center", gap: 6 }}>
                  <Text style={{ fontFamily: fontFamilies.bodySemiBold, fontWeight: "600", color: colors.primary }}>
                    View event
                  </Text>
                  <Ionicons name="arrow-forward" size={16} color={colors.primary} />
                </View>
              </View>
            </Pressable>
          ) : null}

          {featuredStrip.length > 0 ? (
            <View
              style={{
                borderTopWidth: StyleSheet.hairlineWidth,
                borderTopColor: colors.border,
                paddingTop: space.md,
                paddingHorizontal: space.lg,
                paddingBottom: space.md,
              }}
            >
              <TextSectionTitle style={{ marginBottom: space.md, fontSize: 16 }}>More featured</TextSectionTitle>
              <View style={{ flexDirection: "row", flexWrap: "wrap", columnGap: moreGap, rowGap: moreGap }}>
                {featuredStrip.map((item) => (
                  <CollectionCard
                    key={item.id}
                    item={item}
                    layoutVariant={moreNumCols === 2 ? "grid" : "row"}
                    width={moreNumCols === 2 ? moreColW : undefined}
                  />
                ))}
              </View>
            </View>
          ) : null}

          {restPool.length > 0 ? (
            <View
              style={{
                borderTopWidth: StyleSheet.hairlineWidth,
                borderTopColor: colors.border,
                paddingTop: space.md,
                paddingHorizontal: space.lg,
              }}
            >
              <TextSectionTitle style={{ marginBottom: space.md, fontSize: 16 }}>
                {hasSearch ? "Matching events" : "Latest"}
              </TextSectionTitle>

              <View
                style={{
                  flexDirection: "row",
                  flexWrap: "wrap",
                  columnGap: moreGap,
                  rowGap: moreGap,
                }}
              >
                {paginatedRest.map((item) => (
                  <CollectionCard
                    key={item.id}
                    item={item}
                    layoutVariant={moreNumCols === 2 ? "grid" : "row"}
                    width={moreNumCols === 2 ? moreColW : undefined}
                  />
                ))}
              </View>

              {showMorePagination ? (
                <View
                  style={{
                    marginTop: space.lg,
                    flexDirection: "row",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: space.md,
                    paddingVertical: space.sm,
                  }}
                >
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel="Previous page"
                    disabled={morePage <= 1}
                    onPress={() => setMorePage((p) => Math.max(1, p - 1))}
                    style={({ pressed }) => ({
                      flexDirection: "row",
                      alignItems: "center",
                      gap: 6,
                      paddingVertical: space.sm,
                      paddingHorizontal: space.md,
                      borderRadius: radii.sm,
                      borderWidth: 1,
                      borderColor: morePage <= 1 ? colors.border : colors.primary,
                      opacity: morePage <= 1 ? 0.45 : pressed ? 0.85 : 1,
                    })}
                  >
                    <Ionicons name="chevron-back" size={18} color={colors.primary} />
                    <Text style={{ fontWeight: "600", color: colors.primary, fontSize: 14 }}>Previous</Text>
                  </Pressable>
                  <TextCaption style={{ color: colors.textSecondary, fontWeight: "600" }}>
                    Page {morePage} of {morePageCount}
                  </TextCaption>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel="Next page"
                    disabled={morePage >= morePageCount}
                    onPress={() => setMorePage((p) => Math.min(morePageCount, p + 1))}
                    style={({ pressed }) => ({
                      flexDirection: "row",
                      alignItems: "center",
                      gap: 6,
                      paddingVertical: space.sm,
                      paddingHorizontal: space.md,
                      borderRadius: radii.sm,
                      borderWidth: 1,
                      borderColor: morePage >= morePageCount ? colors.border : colors.primary,
                      opacity: morePage >= morePageCount ? 0.45 : pressed ? 0.85 : 1,
                    })}
                  >
                    <Text style={{ fontWeight: "600", color: colors.primary, fontSize: 14 }}>Next</Text>
                    <Ionicons name="chevron-forward" size={18} color={colors.primary} />
                  </Pressable>
                </View>
              ) : null}
            </View>
          ) : null}
        </View>
      </Screen>
    </>
  );
}
