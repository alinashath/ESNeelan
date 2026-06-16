import { Pressable, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useSellersRankedByActiveListings } from "@/src/data/sellers";
import { SellerTrendingCard } from "@/src/components/ui/SellerTrendingCard";
import { TextSectionTitle } from "@/src/components/ui/TextSectionTitle";
import { appleSpacing, colors, fontFamilies, space } from "@/src/theme/tokens";

const VIEW_ALL_LABEL = {
  fontFamily: fontFamilies.bodySemiBold,
  fontWeight: "600" as const,
  fontSize: 12,
  letterSpacing: 0.8,
  color: colors.primary,
  textTransform: "uppercase" as const,
};

export type HomeTopSellersLayoutProps = {
  /** Same as trending grid column width (`colW`). */
  columnWidth: number;
  /** Same gutter as trending (`space.sm`). */
  gap: number;
  multiColumn: boolean;
};

/**
 * Home “Top sellers” — top five by active listing count; cards match **Trending** `AuctionCard` size.
 */
export function HomeTopSellers({ columnWidth, gap, multiColumn }: HomeTopSellersLayoutProps) {
  const { data: sellers } = useSellersRankedByActiveListings({ limit: 5 });
  const rows = sellers ?? [];
  if (rows.length === 0) return null;

  return (
    <View style={{ marginTop: appleSpacing.section }}>
      <View
        style={{
          marginBottom: space.md,
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <TextSectionTitle>Top Sellers</TextSectionTitle>
        <Pressable
          onPress={() => router.push("/sellers")}
          hitSlop={12}
          accessibilityRole="button"
          accessibilityLabel="View all sellers"
        >
          <View style={{ flexDirection: "row", alignItems: "center" }}>
            <Text style={VIEW_ALL_LABEL}>VIEW ALL</Text>
            <Ionicons
              name="arrow-forward"
              size={14}
              color={colors.primary}
              style={{ marginLeft: 4 }}
            />
          </View>
        </Pressable>
      </View>

      <View
        style={{
          flexDirection: multiColumn ? "row" : "column",
          flexWrap: multiColumn ? "wrap" : "nowrap",
          gap: multiColumn ? gap : 0,
        }}
      >
        {rows.map((s) => (
          <View key={s.id} style={multiColumn ? { width: columnWidth } : undefined}>
            <SellerTrendingCard
              seller={s}
              compact={multiColumn}
              inGrid={multiColumn}
              onPress={() => router.push(`/seller/${s.id}`)}
            />
          </View>
        ))}
      </View>
    </View>
  );
}
