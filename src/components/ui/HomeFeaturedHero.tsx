import {
  ImageBackground,
  Pressable,
  View,
  Text,
  StyleSheet,
  useWindowDimensions,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { colors, fontFamilies, radii, space, typography } from "@/src/theme/tokens";
import type { AuctionCardAuction } from "./AuctionCard";
import { AuctionCountdownBadge } from "./AuctionCountdownBadge";
import { isAuctionLiveForUi } from "@/src/lib/auction-live";
import { ValueCurrency } from "./ValueCurrency";

/** Matches BIDMASTER_DESIGN hero (ES Neelan): dark at bottom, clear image toward top (no solid band, no global dim). */
const HERO_SCRIM_COLORS = [
  "rgba(10,10,15,0.95)",
  "rgba(10,10,15,0.35)",
  "rgba(10,10,15,0)",
] as const;

const HERO_SCRIM_LOCATIONS = [0, 0.58, 1] as const;

type Props = {
  auction: AuctionCardAuction;
  onPress: () => void;
  currency?: string;
  /** When set (e.g. home carousel), overrides default full-bleed minus padding width. */
  cardWidth?: number;
};

/** Featured lot — bottom→top scrim; accent ribbon; display title (Apple Clean). */
export function HomeFeaturedHero({
  auction,
  onPress,
  currency = "MVR",
  cardWidth: cardWidthProp,
}: Props) {
  const { width: winW } = useWindowDimensions();
  const pad = space.lg;
  const cardW = cardWidthProp ?? winW - pad * 2;
  const bid = auction.current_highest_bid ?? auction.starting_price;
  const liveUi = isAuctionLiveForUi(auction.status, auction.ends_at);

  const scrim = (
    <LinearGradient
      colors={[...HERO_SCRIM_COLORS]}
      locations={[...HERO_SCRIM_LOCATIONS]}
      start={{ x: 0.5, y: 1 }}
      end={{ x: 0.5, y: 0 }}
      style={StyleSheet.absoluteFill}
    />
  );

  const overlayContent = (
    <>
      {scrim}
      {liveUi ? (
        <AuctionCountdownBadge
          endsAt={auction.ends_at}
          active
          inset={space.md}
          maxWidth={cardW * 0.52}
        />
      ) : null}

      <View
        style={{
          position: "absolute",
          left: space.lg,
          right: space.lg,
          bottom: space.lg,
        }}
      >
        <View
          style={{
            alignSelf: "flex-start",
            backgroundColor: colors.accent,
            paddingHorizontal: space.md,
            paddingVertical: space.sm,
            borderRadius: radii.pill,
            marginBottom: space.sm,
          }}
        >
          <Text
            style={{
              color: colors.onAccent,
              fontWeight: "600",
              fontSize: 9,
              letterSpacing: 2,
              fontFamily: fontFamilies.bodySemiBold,
            }}
          >
            FEATURED
          </Text>
        </View>
        <Text
          style={{
            ...typography.display,
            fontSize: 24,
            lineHeight: 30,
            color: colors.ivory,
          }}
          numberOfLines={2}
        >
          {auction.title}
        </Text>
        <View style={{ flexDirection: "row", flexWrap: "wrap", marginTop: space.md, alignItems: "baseline" }}>
          <Text
            style={{
              color: "rgba(245, 240, 232, 0.82)",
              fontSize: 10,
              fontWeight: "600",
              letterSpacing: 1.4,
              fontFamily: fontFamilies.bodySemiBold,
              textTransform: "uppercase",
            }}
          >
            Current bid{" "}
          </Text>
          <ValueCurrency amount={bid} currency={currency} size="compact" />
        </View>
      </View>
    </>
  );

  return (
    <Pressable onPress={onPress} style={{ width: cardW, alignSelf: "center" }}>
      {auction.image_url ? (
        <ImageBackground
          source={{ uri: auction.image_url }}
          style={{
            width: "100%",
            height: 300,
            borderRadius: radii.lg,
            overflow: "hidden",
            borderWidth: 1,
            borderColor: colors.border,
          }}
          resizeMode="cover"
        >
          {overlayContent}
        </ImageBackground>
      ) : (
        <View
          style={{
            width: "100%",
            height: 300,
            borderRadius: radii.lg,
            overflow: "hidden",
            backgroundColor: colors.surfaceMuted,
            borderWidth: 1,
            borderColor: colors.border,
          }}
        >
          {overlayContent}
        </View>
      )}
    </Pressable>
  );
}
