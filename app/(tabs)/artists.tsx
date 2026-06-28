import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Image,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from "react-native";
import { router, useFocusEffect, type Href } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import {
  usePublishedFeaturedArticlesForArtistsHub,
  type FeaturedArticleHubListItem,
} from "@/src/data/featured-articles";
import { featuredArticleMatchesSearch } from "@/src/lib/featured-article-search-haystack";
import { Screen } from "@/src/components/ui/Screen";
import { SearchField } from "@/src/components/ui/SearchField";
import { ListEmptyState } from "@/src/components/ui/ListEmptyState";
import { TextBody } from "@/src/components/ui/TextBody";
import { TextCaption } from "@/src/components/ui/TextCaption";
import { TextSectionTitle } from "@/src/components/ui/TextSectionTitle";
import { layout } from "@/src/theme/layout";
import { colors, fontFamilies, radii, space } from "@/src/theme/tokens";

const MORE_STORIES_PAGE_SIZE = 5;
const TWO_COL_MIN_INNER = 420;

function formatHubDate(iso: string | null): string {
  if (!iso) return "";
  try {
    return new Date(iso).toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  } catch {
    return "";
  }
}

function openArticle(slug: string) {
  router.push(`/article/${encodeURIComponent(slug)}` as Href);
}

type StoryCardProps = {
  item: FeaturedArticleHubListItem;
  layoutVariant: "grid" | "row";
  width?: number;
};

function StoryCard({ item, layoutVariant, width }: StoryCardProps) {
  const thumb =
    item.cover_display_url ? (
      <Image
        source={{ uri: item.cover_display_url }}
        style={
          layoutVariant === "grid"
            ? {
                width: "100%",
                aspectRatio: 16 / 9,
                borderRadius: radii.sm,
                backgroundColor: colors.surfaceMuted,
              }
            : {
                width: 112,
                height: 80,
                borderRadius: radii.sm,
                backgroundColor: colors.surfaceMuted,
              }
        }
        resizeMode="cover"
      />
    ) : (
      <View
        style={
          layoutVariant === "grid"
            ? {
                width: "100%",
                aspectRatio: 16 / 9,
                borderRadius: radii.sm,
                backgroundColor: colors.accentTint,
                alignItems: "center",
                justifyContent: "center",
              }
            : {
                width: 112,
                height: 80,
                borderRadius: radii.sm,
                backgroundColor: colors.accentTint,
                alignItems: "center",
                justifyContent: "center",
              }
        }
      >
        <Ionicons name="image-outline" size={layoutVariant === "grid" ? 32 : 28} color={colors.textMuted} />
      </View>
    );

  const textBlock = (
    <View style={{ flex: 1, minWidth: 0, justifyContent: "center" }}>
      <Text
        numberOfLines={layoutVariant === "grid" ? 4 : 3}
        style={{
          fontFamily: fontFamilies.headingSerif,
          fontSize: layoutVariant === "grid" ? 16 : 17,
          lineHeight: layoutVariant === "grid" ? 21 : 22,
          fontWeight: "600",
          color: colors.text,
        }}
      >
        {item.title}
      </Text>
      {item.published_at ? (
        <TextCaption style={{ marginTop: 4, color: colors.textMuted }}>{formatHubDate(item.published_at)}</TextCaption>
      ) : null}
      {item.excerpt ? (
        <TextCaption numberOfLines={layoutVariant === "grid" ? 3 : 2} style={{ marginTop: space.xs, lineHeight: 18 }}>
          {item.excerpt}
        </TextCaption>
      ) : null}
    </View>
  );

  return (
    <Pressable
      onPress={() => openArticle(item.slug)}
      accessibilityRole="button"
      accessibilityLabel={item.title}
      style={({ pressed }) => ({
        width: layoutVariant === "grid" && width != null ? width : "100%",
        opacity: pressed ? 0.9 : 1,
        flexDirection: layoutVariant === "grid" ? "column" : "row",
        gap: space.md,
        paddingVertical: space.md,
        borderBottomWidth: layoutVariant === "row" ? StyleSheet.hairlineWidth : 0,
        borderBottomColor: colors.border,
      })}
    >
      {thumb}
      {textBlock}
    </Pressable>
  );
}

export default function ArtistsScreen() {
  const { width: windowW } = useWindowDimensions();
  const { data, isLoading, isRefetching, refetch } = usePublishedFeaturedArticlesForArtistsHub();
  const list: FeaturedArticleHubListItem[] = Array.isArray(data) ? data : [];
  const [search, setSearch] = useState("");
  const [moreStoriesPage, setMoreStoriesPage] = useState(1);

  const columnMax = layout.articleReadingMaxWidth;
  const innerW = Math.max(0, Math.min(windowW, columnMax) - space.lg * 2);
  const moreStoriesGap = space.md;
  const moreStoriesNumCols = innerW >= TWO_COL_MIN_INNER ? 2 : 1;
  const moreStoryColW =
    moreStoriesNumCols === 2 ? (innerW - moreStoriesGap) / 2 : innerW;

  const searchTrim = search.trim();
  const hasSearch = searchTrim.length > 0;

  const filtered = useMemo(() => {
    if (!hasSearch) return list;
    return list.filter((item) => featuredArticleMatchesSearch(item, searchTrim));
  }, [list, hasSearch, searchTrim]);

  const latest = !hasSearch && filtered.length > 0 ? filtered[0] : null;
  const restPool = hasSearch ? filtered : filtered.slice(1);

  useEffect(() => {
    setMoreStoriesPage(1);
  }, [searchTrim, restPool.length]);

  const moreStoriesPageCount = Math.max(1, Math.ceil(restPool.length / MORE_STORIES_PAGE_SIZE));
  const paginatedRest = useMemo(() => {
    const start = (moreStoriesPage - 1) * MORE_STORIES_PAGE_SIZE;
    return restPool.slice(start, start + MORE_STORIES_PAGE_SIZE);
  }, [restPool, moreStoriesPage]);

  const showMoreStoriesPagination = restPool.length > MORE_STORIES_PAGE_SIZE;

  useFocusEffect(
    useCallback(() => {
      void refetch();
    }, [refetch]),
  );

  if (isLoading && list.length === 0) {
    return (
      <Screen>
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center", paddingVertical: space.xxl }}>
          <ActivityIndicator color={colors.accent} accessibilityLabel="Loading stories" />
        </View>
      </Screen>
    );
  }

  if (!list.length) {
    return (
      <Screen scroll>
        <View style={{ maxWidth: layout.articleReadingMaxWidth, alignSelf: "center", width: "100%" }}>
          <TextSectionTitle style={{ marginBottom: space.md }}>Stories</TextSectionTitle>
          <ListEmptyState
            icon="color-palette-outline"
            title="No stories yet"
            description="Check back soon for artist profiles and features."
          />
        </View>
      </Screen>
    );
  }

  return (
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
          <TextSectionTitle>Stories</TextSectionTitle>
        </View>

        <View style={{ paddingHorizontal: space.lg, marginBottom: space.md }}>
          <SearchField
            placeholder="Search"
            value={search}
            onChangeText={setSearch}
            showIdleSuggestions={false}
            accessibilityLabel="Search articles"
          />
        </View>

        {hasSearch && filtered.length === 0 ? (
          <View style={{ paddingHorizontal: space.lg }}>
            <ListEmptyState
              icon="search-outline"
              title="No matches"
              description="Try different words — search includes body text, quotes, and Q&A."
              actionLabel="Clear search"
              onActionPress={() => setSearch("")}
            />
          </View>
        ) : null}

        {latest ? (
          <Pressable
            onPress={() => openArticle(latest.slug)}
            accessibilityRole="button"
            accessibilityLabel={`Latest: ${latest.title}`}
            style={({ pressed }) => ({ opacity: pressed ? 0.94 : 1 })}
          >
            {latest.cover_display_url ? (
              <Image
                source={{ uri: latest.cover_display_url }}
                style={{ width: "100%", aspectRatio: 16 / 9, backgroundColor: colors.surfaceMuted }}
                resizeMode="cover"
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
                <Ionicons name="color-palette-outline" size={48} color={colors.primary} />
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
                LATEST
              </Text>
              <Text
                style={{
                  fontFamily: fontFamilies.headingSerif,
                  fontSize: 26,
                  lineHeight: 32,
                  fontWeight: "700",
                  color: colors.text,
                }}
              >
                {latest.title}
              </Text>
              {latest.published_at ? (
                <TextCaption style={{ marginTop: space.sm, color: colors.textMuted }}>
                  {formatHubDate(latest.published_at)}
                </TextCaption>
              ) : null}
              {latest.excerpt ? (
                <TextBody style={{ marginTop: space.md, lineHeight: 24, color: colors.textSecondary }}>
                  {latest.excerpt}
                </TextBody>
              ) : null}
              <View style={{ marginTop: space.md, flexDirection: "row", alignItems: "center", gap: 6 }}>
                <Text style={{ fontFamily: fontFamilies.bodySemiBold, fontWeight: "600", color: colors.primary }}>
                  Read full story
                </Text>
                <Ionicons name="arrow-forward" size={16} color={colors.primary} />
              </View>
            </View>
          </Pressable>
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
              {hasSearch ? "Matching stories" : "More stories"}
            </TextSectionTitle>

            <View
              style={{
                flexDirection: "row",
                flexWrap: "wrap",
                columnGap: moreStoriesGap,
                rowGap: moreStoriesGap,
              }}
            >
              {paginatedRest.map((item) => (
                <StoryCard
                  key={item.id}
                  item={item}
                  layoutVariant={moreStoriesNumCols === 2 ? "grid" : "row"}
                  width={moreStoriesNumCols === 2 ? moreStoryColW : undefined}
                />
              ))}
            </View>

            {showMoreStoriesPagination ? (
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
                  disabled={moreStoriesPage <= 1}
                  onPress={() => setMoreStoriesPage((p) => Math.max(1, p - 1))}
                  style={({ pressed }) => ({
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 6,
                    paddingVertical: space.sm,
                    paddingHorizontal: space.md,
                    borderRadius: radii.sm,
                    borderWidth: 1,
                    borderColor: moreStoriesPage <= 1 ? colors.border : colors.primary,
                    opacity: moreStoriesPage <= 1 ? 0.45 : pressed ? 0.85 : 1,
                  })}
                >
                  <Ionicons name="chevron-back" size={18} color={colors.primary} />
                  <Text style={{ fontWeight: "600", color: colors.primary, fontSize: 14 }}>Previous</Text>
                </Pressable>
                <TextCaption style={{ color: colors.textSecondary, fontWeight: "600" }}>
                  Page {moreStoriesPage} of {moreStoriesPageCount}
                </TextCaption>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Next page"
                  disabled={moreStoriesPage >= moreStoriesPageCount}
                  onPress={() => setMoreStoriesPage((p) => Math.min(moreStoriesPageCount, p + 1))}
                  style={({ pressed }) => ({
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 6,
                    paddingVertical: space.sm,
                    paddingHorizontal: space.md,
                    borderRadius: radii.sm,
                    borderWidth: 1,
                    borderColor: moreStoriesPage >= moreStoriesPageCount ? colors.border : colors.primary,
                    opacity: moreStoriesPage >= moreStoriesPageCount ? 0.45 : pressed ? 0.85 : 1,
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
  );
}
