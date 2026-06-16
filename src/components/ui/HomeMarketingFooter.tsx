import { useMemo } from "react";
import { Platform, Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useCuratedCategories, useExploreCategoryCounts } from "@/src/data/auctions";
import { appleSpacing, colors, fontFamilies, space } from "@/src/theme/tokens";

const PLATFORM_LINKS = [
  "How it works",
  "Selling guide",
  "Bidding rules",
  "Verified Sellers",
] as const;

const SUPPORT_LINKS = [
  "Help Center",
  "Safety",
  "Terms of Service",
  "Privacy Policy",
] as const;

/**
 * Web-only marketing footer (Stitch “ES Neelan | Modern Auction Platform” export).
 * Platform / Support links open Explore as a placeholder until dedicated pages exist.
 * Categories: top five roots by live+ended listing volume, plus “View all” → `/categories`.
 */
export function HomeMarketingFooter() {
  const router = useRouter();
  if (Platform.OS !== "web") return null;

  const { data: curated } = useCuratedCategories();
  const { data: counts } = useExploreCategoryCounts(curated);

  const roots = useMemo(
    () =>
      (curated ?? [])
        .filter((c) => c.parent_id == null)
        .sort(
          (a, b) => a.sort_order - b.sort_order || a.name.localeCompare(b.name),
        ),
    [curated],
  );

  const topFiveRoots = useMemo(() => {
    const list = [...roots];
    list.sort((a, b) => {
      const cb = counts?.[b.id] ?? 0;
      const ca = counts?.[a.id] ?? 0;
      if (cb !== ca) return cb - ca;
      return a.sort_order - b.sort_order || a.name.localeCompare(b.name);
    });
    return list.slice(0, 5);
  }, [roots, counts]);

  const goExplore = () => {
    router.push("/(tabs)/explore");
  };

  const goCategoriesIndex = () => {
    router.push("/categories");
  };

  const goExploreCategory = (categoryId: string) => {
    router.push({ pathname: "/(tabs)/explore", params: { category: categoryId } });
  };

  return (
    <View style={styles.shell}>
      <View style={styles.grid}>
        <View style={styles.col}>
          <Text style={styles.colTitle}>Platform</Text>
          {PLATFORM_LINKS.map((label) => (
            <Pressable
              key={label}
              onPress={goExplore}
              accessibilityRole="link"
              accessibilityLabel={label}
              style={({ pressed }) => [styles.linkWrap, pressed && { opacity: 0.75 }]}
            >
              <Text style={styles.link}>{label}</Text>
            </Pressable>
          ))}
        </View>

        <View style={styles.col}>
          <Text style={styles.colTitle}>Categories</Text>
          {topFiveRoots.map((c) => (
            <Pressable
              key={c.id}
              onPress={() => goExploreCategory(c.id)}
              accessibilityRole="link"
              accessibilityLabel={`${c.name}, browse in Explore`}
              style={({ pressed }) => [styles.linkWrap, pressed && { opacity: 0.75 }]}
            >
              <Text style={styles.link}>{c.name}</Text>
            </Pressable>
          ))}
          <Pressable
            onPress={goCategoriesIndex}
            accessibilityRole="link"
            accessibilityLabel="View all categories"
            style={({ pressed }) => [styles.linkWrap, pressed && { opacity: 0.75 }]}
          >
            <Text style={styles.viewAll}>View all</Text>
          </Pressable>
        </View>

        <View style={styles.col}>
          <Text style={styles.colTitle}>Support</Text>
          {SUPPORT_LINKS.map((label) => (
            <Pressable
              key={label}
              onPress={goExplore}
              accessibilityRole="link"
              accessibilityLabel={label}
              style={({ pressed }) => [styles.linkWrap, pressed && { opacity: 0.75 }]}
            >
              <Text style={styles.link}>{label}</Text>
            </Pressable>
          ))}
        </View>

        <View style={styles.col}>
          <Text style={styles.colTitle}>Connect</Text>
          <Text style={styles.connectBody}>
            Stay updated with the latest high-value auctions.
          </Text>
          <View style={styles.iconRow}>
            <Pressable
              onPress={goExplore}
              accessibilityRole="button"
              accessibilityLabel="Share"
              style={({ pressed }) => [styles.iconCircle, pressed && { opacity: 0.8 }]}
            >
              <Ionicons name="share-outline" size={18} color={colors.textSecondary} />
            </Pressable>
            <Pressable
              onPress={goExplore}
              accessibilityRole="button"
              accessibilityLabel="Contact"
              style={({ pressed }) => [styles.iconCircle, pressed && { opacity: 0.8 }]}
            >
              <Ionicons name="at-outline" size={18} color={colors.textSecondary} />
            </Pressable>
          </View>
        </View>
      </View>

      <View style={styles.bottomRow}>
        <Text style={styles.meta}>© 2026 ES Neelan. All rights reserved.</Text>
        <View style={styles.metaRow}>
          <Text style={styles.meta}>English (US)</Text>
          <Text style={styles.meta}>Currency: MVR</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  shell: {
    marginTop: appleSpacing.section,
    paddingTop: appleSpacing.lg,
    paddingBottom: space.xxl,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
    backgroundColor: colors.background,
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: space.xl,
    marginBottom: appleSpacing.lg,
    maxWidth: 1120,
    alignSelf: "center",
    width: "100%",
  },
  col: {
    minWidth: 140,
    flexGrow: 1,
    flexBasis: "20%",
    maxWidth: 280,
  },
  colTitle: {
    fontFamily: fontFamilies.headingSerif,
    fontSize: 14,
    fontWeight: "600",
    color: colors.text,
    marginBottom: space.md,
  },
  linkWrap: {
    marginBottom: 10,
  },
  link: {
    fontFamily: fontFamilies.headingSerif,
    fontSize: 13,
    lineHeight: 18,
    color: colors.textSecondary,
  },
  viewAll: {
    fontFamily: fontFamilies.bodySemiBold,
    fontSize: 13,
    lineHeight: 18,
    color: colors.primary,
  },
  connectBody: {
    fontFamily: fontFamilies.headingSerif,
    fontSize: 13,
    lineHeight: 18,
    color: colors.textSecondary,
    marginBottom: space.md,
  },
  iconRow: {
    flexDirection: "row",
    gap: space.sm,
  },
  iconCircle: {
    width: 36,
    height: 36,
    borderRadius: 9999,
    backgroundColor: colors.searchBarFill,
    alignItems: "center",
    justifyContent: "center",
  },
  bottomRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    alignItems: "center",
    gap: space.md,
    paddingTop: space.lg,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
    maxWidth: 1120,
    alignSelf: "center",
    width: "100%",
  },
  meta: {
    fontFamily: fontFamilies.body,
    fontSize: 11,
    lineHeight: 15,
    color: colors.textMuted,
  },
  metaRow: {
    flexDirection: "row",
    gap: space.lg,
  },
});
