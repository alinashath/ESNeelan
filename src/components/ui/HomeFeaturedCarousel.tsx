import { useCallback, useMemo, useState } from "react";
import {
  FlatList,
  NativeScrollEvent,
  NativeSyntheticEvent,
  View,
} from "react-native";
import { router, type Href } from "expo-router";
import { useScreenContentWidth } from "@/src/components/layout/content-width";
import { HomeFeaturedHero } from "@/src/components/ui/HomeFeaturedHero";
import { TextCaption } from "@/src/components/ui/TextCaption";
import { colors, space } from "@/src/theme/tokens";
import type { AuctionCardAuction } from "@/src/components/ui/AuctionCard";

type Props = {
  auctions: AuctionCardAuction[];
  toCardAuction: (item: AuctionCardAuction) => AuctionCardAuction;
  currency?: string;
};

/** Peek next: viewport ≈ card + gap + ~¼ of next card → card = (viewport − gap) / 1.25 */
const PEEK_NEXT_RATIO = 1 / 1.25;
const CARD_GAP = space.md;

/** Horizontal featured strip: one full card in view; with 2+ cards, gap + ~¼ of next peeks. */
export function HomeFeaturedCarousel({ auctions, toCardAuction, currency = "MVR" }: Props) {
  const screenW = useScreenContentWidth();
  /** Matches home `FlatList`: Screen padding + list `contentContainerStyle` horizontal padding */
  const listInnerW = Math.max(0, screenW - space.lg * 4);
  const [page, setPage] = useState(0);

  const viewportW = useMemo(() => Math.max(0, listInnerW), [listInnerW]);
  const { cardW, step } = useMemo(() => {
    if (auctions.length <= 1) {
      return { cardW: viewportW, step: viewportW };
    }
    const cw = Math.max(160, (viewportW - CARD_GAP) * PEEK_NEXT_RATIO);
    return { cardW: cw, step: cw + CARD_GAP };
  }, [auctions.length, viewportW]);

  const onMomentumScrollEnd = useCallback(
    (e: NativeSyntheticEvent<NativeScrollEvent>) => {
      if (auctions.length <= 1) return;
      const x = e.nativeEvent.contentOffset.x;
      const next = Math.round(x / step);
      if (next >= 0 && next < auctions.length) setPage(next);
    },
    [auctions.length, step],
  );

  const getItemLayout = useCallback(
    (_: unknown, index: number) => ({
      length: step,
      offset: step * index,
      index,
    }),
    [step],
  );

  if (!auctions.length) return null;

  return (
    <View style={{ marginTop: space.xl, width: viewportW, alignSelf: "center" }}>
      <FlatList
        showsVerticalScrollIndicator={false}
        showsHorizontalScrollIndicator={false}
        data={auctions}
        keyExtractor={(item) => item.id}
        horizontal
        scrollEnabled={auctions.length > 1}
        decelerationRate="fast"
        snapToInterval={step}
        snapToAlignment="start"
        disableIntervalMomentum
        pagingEnabled={false}
        onMomentumScrollEnd={onMomentumScrollEnd}
        getItemLayout={getItemLayout}
        renderItem={({ item }) => (
          <View
            style={{
              width: step,
              alignItems: "flex-start",
            }}
          >
            <HomeFeaturedHero
              auction={toCardAuction(item)}
              onPress={() => router.push(`/auction/${item.id}` as Href)}
              currency={currency}
              cardWidth={cardW}
            />
          </View>
        )}
      />
      {auctions.length > 1 ? (
        <View
          style={{
            flexDirection: "row",
            justifyContent: "center",
            gap: 6,
            marginTop: space.md,
          }}
        >
          {auctions.map((a) => (
            <View
              key={a.id}
              style={{
                width: a.id === auctions[page]?.id ? 18 : 6,
                height: 6,
                borderRadius: 3,
                backgroundColor: a.id === auctions[page]?.id ? colors.accent : colors.border,
              }}
            />
          ))}
        </View>
      ) : null}
      {auctions.length > 1 ? (
        <TextCaption style={{ textAlign: "center", marginTop: space.sm, color: colors.textMuted }}>
          {page + 1} / {auctions.length} featured
        </TextCaption>
      ) : null}
    </View>
  );
}
