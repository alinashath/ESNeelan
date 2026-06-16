import { useMemo } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  Text,
  View,
} from "react-native";
import { router } from "expo-router";
import { useCuratedCategories, useExploreCategoryCounts } from "@/src/data/auctions";
import type { CategoryRow } from "@/src/data/category-utils";
import { ListEmptyState } from "@/src/components/ui/ListEmptyState";
import { Screen } from "@/src/components/ui/Screen";
import { colors, fontFamilies, space } from "@/src/theme/tokens";

function childrenOf(curated: CategoryRow[], parentId: string) {
  return curated
    .filter((c) => c.parent_id === parentId)
    .sort(
      (a, b) => a.sort_order - b.sort_order || a.name.localeCompare(b.name),
    );
}

/** Opens Explore with the category filter applied (see `explore.tsx` + `category` search param). */
function goExploreCategory(categoryId: string) {
  router.push({ pathname: "/(tabs)/explore", params: { category: categoryId } });
}

export default function CategoriesIndexScreen() {
  const { data: curated, isLoading: loadingCats } = useCuratedCategories();
  const {
    data: counts,
    isPending: countsPending,
    isError: countsError,
    refetch,
  } = useExploreCategoryCounts(curated);

  const sections = useMemo(() => {
    if (!curated?.length || counts == null) return [];
    const roots = curated
      .filter((c) => c.parent_id == null)
      .sort(
        (a, b) => a.sort_order - b.sort_order || a.name.localeCompare(b.name),
      );
    return roots
      .map((root) => {
        const rootCount = counts[root.id] ?? 0;
        if (rootCount === 0) return null;
        const subs = childrenOf(curated, root.id).filter(
          (s) => (counts[s.id] ?? 0) > 0,
        );
        return { root, subs };
      })
      .filter((x): x is { root: CategoryRow; subs: CategoryRow[] } => x != null);
  }, [curated, counts]);

  const showSpinner =
    loadingCats || (Boolean(curated?.length) && countsPending && !countsError);

  return (
    <Screen scroll={false}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          padding: space.lg,
          paddingBottom: space.xxl,
          maxWidth: 720,
          alignSelf: "center",
          width: "100%",
        }}
      >
        <Text
          style={{
            fontFamily: fontFamilies.body,
            fontSize: 12,
            lineHeight: 17,
            color: colors.textMuted,
            marginBottom: space.lg,
          }}
        >
          Only categories with at least one live or ended listing are shown. Tap a row to open
          Explore filtered to that category.
        </Text>

        {showSpinner ? (
          <View style={{ paddingVertical: space.xxl, alignItems: "center" }}>
            <ActivityIndicator color={colors.primary} accessibilityLabel="Loading categories" />
          </View>
        ) : null}

        {countsError ? (
          <ListEmptyState
            icon="alert-circle-outline"
            title="Couldn’t load category counts"
            description="Check your connection and try again."
            actionLabel="Retry"
            onActionPress={() => void refetch()}
          />
        ) : null}

        {!showSpinner && !countsError && sections.length === 0 ? (
          <ListEmptyState
            icon="folder-open-outline"
            title="No categories with listings yet"
            description="When sellers publish auctions in curated categories, they will appear here."
            actionLabel="Browse Explore"
            onActionPress={() => router.push("/(tabs)/explore")}
          />
        ) : null}

        {!showSpinner && !countsError
          ? sections.map(({ root, subs }) => (
              <View key={root.id} style={{ marginBottom: space.xl }}>
                <CategoryRow
                  name={root.name}
                  count={counts?.[root.id] ?? 0}
                  onPress={() => goExploreCategory(root.id)}
                  bold
                />
                {subs.map((sub) => (
                  <CategoryRow
                    key={sub.id}
                    name={sub.name}
                    count={counts?.[sub.id] ?? 0}
                    onPress={() => goExploreCategory(sub.id)}
                    indent
                  />
                ))}
              </View>
            ))
          : null}
      </ScrollView>
    </Screen>
  );
}

function CategoryRow({
  name,
  count,
  onPress,
  indent,
  bold,
}: {
  name: string;
  count: number;
  onPress: () => void;
  indent?: boolean;
  bold?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${name}, ${count} listings`}
      style={({ pressed }) => ({
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        paddingVertical: 8,
        paddingHorizontal: indent ? space.md : 0,
        marginLeft: indent ? space.sm : 0,
        borderBottomWidth: 1,
        borderBottomColor: colors.hairlineSoft,
        opacity: pressed ? 0.75 : 1,
      })}
    >
      <Text
        style={{
          flex: 1,
          paddingRight: space.md,
          fontFamily: bold ? fontFamilies.headingSerif : fontFamilies.body,
          fontSize: bold ? 14 : 13,
          lineHeight: 19,
          fontWeight: bold ? "600" : "400",
          color: bold ? colors.text : colors.textSecondary,
        }}
        numberOfLines={2}
      >
        {name}
      </Text>
      <Text
        style={{
          fontFamily: fontFamilies.bodyMedium,
          fontSize: 12,
          lineHeight: 16,
          color: colors.textMuted,
          fontVariant: ["tabular-nums"],
        }}
      >
        {count}
      </Text>
    </Pressable>
  );
}
