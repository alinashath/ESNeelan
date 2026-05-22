import { useMemo, useState } from "react";
import { FlatList, Pressable, View } from "react-native";
import { router } from "expo-router";
import { useActiveAuctions, useCategories } from "@/src/data/auctions";
import { Screen } from "@/src/components/ui/Screen";
import { TextTitle } from "@/src/components/ui/TextTitle";
import { TextBody } from "@/src/components/ui/TextBody";
import { Chip } from "@/src/components/ui/Chip";
import { ChipRow } from "@/src/components/ui/ChipRow";
import { AuctionCard } from "@/src/components/ui/AuctionCard";
import { space } from "@/src/theme/tokens";

export default function ExploreScreen() {
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const { data: categories } = useCategories();
  const filters = useMemo(
    () => ({ categoryId: categoryId ?? undefined }),
    [categoryId],
  );
  const { data: auctions, isLoading } = useActiveAuctions(filters);

  const header = (
    <View style={{ marginBottom: space.md }}>
      <View
        style={{
          flexDirection: "row",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <TextTitle>Active Auctions</TextTitle>
        <Pressable onPress={() => {}}>
          <TextBody style={{ fontWeight: "700", textDecorationLine: "underline" }}>
            FILTERS
          </TextBody>
        </Pressable>
      </View>
      <View style={{ marginTop: space.md }}>
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
      {isLoading ? (
        <TextBody style={{ marginTop: space.md }}>Loading…</TextBody>
      ) : null}
    </View>
  );

  return (
    <Screen scroll={false}>
      <FlatList
        data={auctions ?? []}
        keyExtractor={(item) => item.id}
        ListHeaderComponent={header}
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
            onPress={() => router.push(`/auction/${item.id}`)}
          />
        )}
      />
    </Screen>
  );
}
