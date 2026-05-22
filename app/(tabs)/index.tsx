import { useMemo, useState } from "react";
import { FlatList, View } from "react-native";
import { router } from "expo-router";
import { useActiveAuctions, useCategories } from "@/src/data/auctions";
import { Screen } from "@/src/components/ui/Screen";
import { HeaderLogoRow } from "@/src/components/ui/HeaderLogoRow";
import { SearchField } from "@/src/components/ui/SearchField";
import { Chip } from "@/src/components/ui/Chip";
import { ChipRow } from "@/src/components/ui/ChipRow";
import { AuctionCard } from "@/src/components/ui/AuctionCard";
import { TextSectionTitle } from "@/src/components/ui/TextSectionTitle";
import { TextCaption } from "@/src/components/ui/TextCaption";
import { space } from "@/src/theme/tokens";

export default function HomeScreen() {
  const [search, setSearch] = useState("");
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const { data: categories } = useCategories();
  const filters = useMemo(
    () => ({ search: search.trim() || undefined, categoryId: categoryId ?? undefined }),
    [search, categoryId],
  );
  const { data: auctions, isLoading } = useActiveAuctions(filters);

  const featured = auctions?.[0];
  const rest = auctions?.slice(1) ?? [];

  const header = (
    <>
      <HeaderLogoRow />
      <SearchField
        placeholder="Search auctions..."
        value={search}
        onChangeText={setSearch}
      />
      <View style={{ marginTop: space.lg }}>
        <ChipRow>
          <Chip
            title="All"
            selected={categoryId === null}
            onPress={() => setCategoryId(null)}
          />
          {(categories ?? [])
            .filter((c) => c.slug !== "all")
            .map((c) => (
              <Chip
                key={c.id}
                title={c.name}
                selected={categoryId === c.id}
                onPress={() => setCategoryId(c.id)}
              />
            ))}
        </ChipRow>
      </View>

      {featured ? (
        <View style={{ marginTop: space.xl }}>
          <TextCaption style={{ marginBottom: space.sm, fontWeight: "700" }}>
            FEATURED ITEM
          </TextCaption>
          <AuctionCard
            auction={{
              id: featured.id,
              title: featured.title,
              status: featured.status,
              ends_at: featured.ends_at,
              current_highest_bid: featured.current_highest_bid,
              starting_price: featured.starting_price,
              bid_count: featured.bid_count,
              image_url: featured.image_url,
            }}
            onPress={() => router.push(`/auction/${featured.id}`)}
          />
        </View>
      ) : null}

      <TextSectionTitle style={{ marginTop: space.lg }}>Trending</TextSectionTitle>
      {isLoading ? <TextCaption>Loading…</TextCaption> : null}
    </>
  );

  const footer = (
    <View
      style={{
        flexDirection: "row",
        justifyContent: "space-between",
        marginTop: space.xl,
        paddingVertical: space.lg,
      }}
    >
      <TextCaption style={{ fontWeight: "700" }}>1.2k+ LIVE ITEMS</TextCaption>
      <TextCaption style={{ fontWeight: "700" }}>24/7 BIDDING</TextCaption>
      <TextCaption style={{ fontWeight: "700" }}>LOCAL SMS</TextCaption>
    </View>
  );

  return (
    <Screen scroll={false}>
      <FlatList
        data={rest}
        keyExtractor={(item) => item.id}
        ListHeaderComponent={header}
        ListFooterComponent={footer}
        contentContainerStyle={{ padding: space.lg, paddingBottom: space.xxl }}
        renderItem={({ item }) => (
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
            }}
            compact
            onPress={() => router.push(`/auction/${item.id}`)}
          />
        )}
      />
    </Screen>
  );
}
