import { useCallback, useMemo, useState } from "react";
import {
  FlatList,
  NativeScrollEvent,
  NativeSyntheticEvent,
  Platform,
  View,
  type ViewStyle,
} from "react-native";
import { router, type Href } from "expo-router";
import { useScreenContentWidth } from "@/src/components/layout/content-width";
import { HomeFeaturedHero } from "@/src/components/ui/HomeFeaturedHero";
import { TextCaption } from "@/src/components/ui/TextCaption";
import { layout } from "@/src/theme/layout";
import { colors, space } from "@/src/theme/tokens";
import type { AuctionCardAuction } from "@/src/components/ui/AuctionCard";

type FeaturedAuctionRow = AuctionCardAuction & {
  description?: string | null;
  item_condition_label?: string | null;
  listing_detail_chip_labels?: string[];
};

type Props = {
  auctions: FeaturedAuctionRow[];
  toCardAuction: (item: FeaturedAuctionRow) => AuctionCardAuction;
  currency?: string;
};

const PEEK_NEXT_RATIO = 1 / 1.25;
const CARD_GAP = space.lg;

/** Below `md`, show one featured card per viewport (no peek) with comfortable height. */
const NARROW_FEATURED_MAX_W = layout.breakpoints.md;
/** Multi-card narrow row — wider than portrait so the block height stays reasonable. */
const NARROW_FEATURED_ASPECT = 3 / 2;

function featuredCardWidthForViewport(
  viewportW: number,
  count: number,
  opts: { webMultiPeek: boolean },
): { cardW: number; step: number } {
  if (count <= 1) {
    return { cardW: viewportW, step: viewportW };
  }
  const g = CARD_GAP;
  if (opts.webMultiPeek && Platform.OS === "web") {
    if (count >= 3) {
      const cw = Math.max(160, (viewportW - 2 * g) / 2.5);
      return { cardW: cw, step: cw + g };
    }
    const cw = Math.max(160, (viewportW - g) / 2);
    return { cardW: cw, step: cw + g };
  }
  const cw = Math.max(160, (viewportW - g) * PEEK_NEXT_RATIO);
  return { cardW: cw, step: cw + g };
}

/** Stitch-style columns: 3-up desktop, 2-up tablet, 1-up = horizontal peek carousel. */
function featuredColumnCount(viewportW: number): number {
  if (viewportW >= layout.breakpoints.lg) return 3;
  if (viewportW >= layout.breakpoints.md) return 2;
  return 1;
}

/**
 * Featured strip — wide web/tablet: equal-height row grid with gaps (Stitch).
 * Narrow / native: horizontal snap carousel with peek.
 */
export function HomeFeaturedCarousel({ auctions, toCardAuction, currency = "MVR" }: Props) {
  const screenW = useScreenContentWidth();
  const listInnerW = Math.max(0, screenW - space.lg * 4);
  const [page, setPage] = useState(0);

  const viewportW = useMemo(() => Math.max(0, listInnerW), [listInnerW]);
  const cols = useMemo(() => featuredColumnCount(viewportW), [viewportW]);
  const isNarrowFeatured = viewportW < NARROW_FEATURED_MAX_W;

  const { cardW, step } = useMemo(() => {
    if (auctions.length <= 1) {
      return { cardW: viewportW, step: viewportW };
    }
    if (isNarrowFeatured) {
      return { cardW: viewportW, step: viewportW };
    }
    return featuredCardWidthForViewport(viewportW, auctions.length, { webMultiPeek: true });
  }, [auctions.length, viewportW, isNarrowFeatured]);

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

  if (Platform.OS === "web" && cols > 1) {
    const webGridStyle = {
      marginTop: space.xxl,
      width: viewportW,
      alignSelf: "center" as const,
      display: "grid",
      gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))`,
      gap: CARD_GAP,
    } as unknown as ViewStyle;

    return (
      <View style={webGridStyle}>
        {auctions.map((item, index) => (
          <View key={item.id} style={{ minWidth: 0, width: "100%" }}>
            <HomeFeaturedHero
              auction={toCardAuction(item)}
              onPress={() => router.push(`/auction/${item.id}` as Href)}
              currency={currency}
              fillParent
              showCountdown={index === 0}
            />
          </View>
        ))}
      </View>
    );
  }

  const usePageSnap = isNarrowFeatured && auctions.length > 1;

  return (
    <View style={{ marginTop: space.xxl, width: viewportW, alignSelf: "center" }}>
      <FlatList
        showsVerticalScrollIndicator={false}
        showsHorizontalScrollIndicator={false}
        data={auctions}
        keyExtractor={(item) => item.id}
        horizontal
        scrollEnabled={auctions.length > 1}
        decelerationRate="fast"
        {...(usePageSnap
          ? { pagingEnabled: true }
          : {
              snapToInterval: step,
              snapToAlignment: "start" as const,
              disableIntervalMomentum: true,
              pagingEnabled: false,
            })}
        onMomentumScrollEnd={onMomentumScrollEnd}
        getItemLayout={getItemLayout}
        renderItem={({ item, index }) => (
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
              showCountdown={index === 0}
              mediaAspectRatio={
                usePageSnap ? NARROW_FEATURED_ASPECT : undefined
              }
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
