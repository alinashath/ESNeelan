import { useMemo } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  Text,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useCuratedCategories, useExploreCategoryCounts } from "@/src/data/auctions";
import type { CategoryRow } from "@/src/data/category-utils";
import { ListEmptyState } from "@/src/components/ui/ListEmptyState";
import { Screen } from "@/src/components/ui/Screen";
import { SiteSeoHead } from "@/src/components/web/SiteSeoHead";
import { APP_DISPLAY_NAME } from "@/src/lib/brand";
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

type TreeNode = {
  category: CategoryRow;
  count: number;
  children: TreeNode[];
};

function buildTree(
  curated: CategoryRow[],
  counts: Record<string, number>,
  parentId: string | null,
): TreeNode[] {
  const nodes =
    parentId == null
      ? curated
          .filter((c) => c.parent_id == null)
          .sort(
            (a, b) => a.sort_order - b.sort_order || a.name.localeCompare(b.name),
          )
      : childrenOf(curated, parentId);

  return nodes
    .map((category) => {
      const count = counts[category.id] ?? 0;
      if (count === 0) return null;
      return {
        category,
        count,
        children: buildTree(curated, counts, category.id),
      };
    })
    .filter((x): x is TreeNode => x != null);
}

export default function CategoriesIndexScreen() {
  const { data: curated, isLoading: loadingCats } = useCuratedCategories();
  const {
    data: counts,
    isPending: countsPending,
    isError: countsError,
    refetch,
  } = useExploreCategoryCounts(curated);

  const tree = useMemo(() => {
    if (!curated?.length || counts == null) return [];
    return buildTree(curated, counts, null);
  }, [curated, counts]);

  const showSpinner =
    loadingCats || (Boolean(curated?.length) && countsPending && !countsError);

  return (
    <>
      <SiteSeoHead
        title={`Categories | ${APP_DISPLAY_NAME}`}
        canonicalPath="/categories"
      />
      <Screen scroll={false} noPadding>
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{
            paddingHorizontal: space.lg,
            paddingTop: space.md,
            paddingBottom: space.xxl,
            maxWidth: 720,
            alignSelf: "center",
            width: "100%",
            flexGrow: 1,
          }}
        >
          <Text
            style={{
              fontFamily: fontFamilies.body,
              fontSize: 14,
              lineHeight: 20,
              color: colors.textMuted,
              marginBottom: space.xl,
            }}
          >
            Browse live and ended listings by category. Only categories with items are
            listed — tap one to open Explore filtered to that selection.
          </Text>

          {showSpinner ? (
            <View style={{ paddingVertical: space.xxl, alignItems: "center" }}>
              <ActivityIndicator
                color={colors.primary}
                accessibilityLabel="Loading categories"
              />
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

          {!showSpinner && !countsError && tree.length === 0 ? (
            <ListEmptyState
              icon="folder-open-outline"
              title="No categories with listings yet"
              description="When sellers publish auctions in curated categories, they will appear here."
              actionLabel="Browse Explore"
              onActionPress={() => router.push("/(tabs)/explore")}
            />
          ) : null}

          {!showSpinner && !countsError
            ? tree.map((node) => (
                <CategoryBranch key={node.category.id} node={node} depth={0} />
              ))
            : null}
        </ScrollView>
      </Screen>
    </>
  );
}

function CategoryBranch({ node, depth }: { node: TreeNode; depth: number }) {
  return (
    <View style={{ marginBottom: depth === 0 ? space.lg : 0 }}>
      <CategoryRow
        name={node.category.name}
        count={node.count}
        onPress={() => goExploreCategory(node.category.id)}
        depth={depth}
        bold={depth === 0}
      />
      {node.children.map((child) => (
        <CategoryBranch key={child.category.id} node={child} depth={depth + 1} />
      ))}
    </View>
  );
}

function CategoryRow({
  name,
  count,
  onPress,
  depth,
  bold,
}: {
  name: string;
  count: number;
  onPress: () => void;
  depth: number;
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
        minHeight: 48,
        paddingVertical: space.md,
        paddingLeft: depth * space.lg,
        paddingRight: space.xs,
        borderBottomWidth: 1,
        borderBottomColor: colors.hairlineSoft,
        opacity: pressed ? 0.75 : 1,
      })}
    >
      <View style={{ flex: 1, flexDirection: "row", alignItems: "center", gap: space.sm }}>
        {depth > 0 ? (
          <Ionicons name="return-down-forward-outline" size={16} color={colors.textMuted} />
        ) : null}
        <Text
          style={{
            flex: 1,
            paddingRight: space.md,
            fontFamily: bold ? fontFamilies.headingSerif : fontFamilies.body,
            fontSize: bold ? 17 : 15,
            lineHeight: bold ? 22 : 20,
            fontWeight: bold ? "600" : "400",
            color: bold ? colors.text : colors.textSecondary,
          }}
          numberOfLines={2}
        >
          {name}
        </Text>
      </View>
      <View
        style={{
          minWidth: 36,
          paddingHorizontal: 10,
          paddingVertical: 4,
          borderRadius: 999,
          backgroundColor: colors.chipIdle,
          alignItems: "center",
        }}
      >
        <Text
          style={{
            fontFamily: fontFamilies.bodyMedium,
            fontSize: 13,
            lineHeight: 16,
            color: colors.text,
            fontVariant: ["tabular-nums"],
          }}
        >
          {count}
        </Text>
      </View>
    </Pressable>
  );
}
