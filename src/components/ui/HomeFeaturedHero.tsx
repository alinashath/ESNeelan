import { useEffect, useState } from "react";
import { isAuctionLiveForUi, isAuctionSoldForUi } from "@/src/lib/auction-live";
import {
  durationPhotoHoverMs,
  easingPhotoHover,
} from "@/src/lib/ui-motion";
import {
  colors,
  fontFamilies,
  radii,
  space,
} from "@/src/theme/tokens";
import { LinearGradient } from "expo-linear-gradient";
import {
  ImageBackground,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from "react-native";
import Animated, {
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import type { AuctionCardAuction } from "./AuctionCard";
import { AuctionCountdownBadge } from "./AuctionCountdownBadge";
import { AuctionSoldBookmark } from "./AuctionSoldBookmark";
import { ValueCurrency } from "./ValueCurrency";

/** Hero scrim — legibility on photography (bottom-heavy). */
const HERO_SCRIM_COLORS = [
  "rgba(0,0,0,0.78)",
  "rgba(0,0,0,0.28)",
  "rgba(0,0,0,0)",
] as const;

const HERO_SCRIM_LOCATIONS = [0, 0.58, 1] as const;

/** Stitch featured cards — portrait ~4:5 (width:height). */
const FEATURED_ASPECT = 4 / 5;

const PHOTO_HOVER_SCALE = 1.06;

type Props = {
  auction: AuctionCardAuction;
  onPress: () => void;
  currency?: string;
  /** When set (e.g. home carousel / grid cell), sets card width. */
  cardWidth?: number;
  /**
   * Fill the parent width (e.g. CSS grid column). Prefer over `cardWidth` when the column
   * is `minmax(0, 1fr)` so borders/hairlines do not wrap the row on web.
   */
  fillParent?: boolean;
  /** First featured lot only — Stitch top-right countdown pill. */
  showCountdown?: boolean;
  /** Override media aspect (width ÷ height). Default portrait `4/5`; use e.g. `3/2` for compact single-column carousels. */
  mediaAspectRatio?: number;
};

/** Featured lot — full-bleed image, countdown or sold bookmark top-right, title + bid bottom. */
export function HomeFeaturedHero({
  auction,
  onPress,
  currency = "MVR",
  cardWidth: cardWidthProp,
  fillParent = false,
  showCountdown = true,
  mediaAspectRatio = FEATURED_ASPECT,
}: Props) {
  const { width: winW } = useWindowDimensions();
  const pad = space.lg;
  const cardW = fillParent ? 0 : (cardWidthProp ?? winW - pad * 2);
  const bid = auction.current_highest_bid ?? auction.starting_price;
  const liveUi = isAuctionLiveForUi(auction.status, auction.ends_at);
  const soldUi = isAuctionSoldForUi(auction.status);

  const reducedMotion = useReducedMotion();
  const [photoHovered, setPhotoHovered] = useState(false);
  const photoScale = useSharedValue(1);

  useEffect(() => {
    if (Platform.OS !== "web" || reducedMotion) {
      photoScale.value = 1;
      return;
    }
    photoScale.value = withTiming(photoHovered ? PHOTO_HOVER_SCALE : 1, {
      duration: durationPhotoHoverMs,
      easing: easingPhotoHover,
    });
  }, [photoHovered, photoScale, reducedMotion]);

  const photoAnimStyle = useAnimatedStyle(() => ({
    transform: [{ scale: photoScale.value }],
  }));

  const scrim = (
    <LinearGradient
      colors={[...HERO_SCRIM_COLORS]}
      locations={[...HERO_SCRIM_LOCATIONS]}
      start={{ x: 0.5, y: 1 }}
      end={{ x: 0.5, y: 0 }}
      style={StyleSheet.absoluteFill}
    />
  );

  const media = (
    <>
      {scrim}

      {liveUi && showCountdown ? (
        <AuctionCountdownBadge
          endsAt={auction.ends_at}
          active
          inset={space.xl}
          maxWidth={fillParent ? "52%" : cardW * 0.52}
          tone="heroDark"
          style={{ borderRadius: radii.pill }}
        />
      ) : soldUi ? (
        <AuctionSoldBookmark size="hero" />
      ) : null}

      <View
        style={{
          position: "absolute",
          left: space.xl,
          right: space.xl,
          bottom: space.xl,
        }}
      >
        <Text
          style={{
            fontSize: 22,
            lineHeight: 28,
            fontWeight: "400",
            fontFamily: fontFamilies.headingSerif,
            letterSpacing: Platform.OS === "web" ? -0.5 : -0.37,
            color: colors.ivory,
          }}
          numberOfLines={2}
        >
          {auction.title}
        </Text>
        <View style={{ marginTop: space.md }}>
          {!soldUi ? (
            <Text
              style={{
                color: colors.ivoryMuted,
                fontSize: 10,
                fontWeight: "400",
                letterSpacing: 0.6,
                fontFamily: fontFamilies.body,
                textTransform: "uppercase",
                marginBottom: space.xs,
              }}
            >
              Current bid
            </Text>
          ) : null}
          <ValueCurrency
            amount={bid}
            currency={currency}
            size="default"
            layout="inline"
            currencyColor={colors.ivoryMuted}
            amountColor={colors.ivory}
            amountFontWeight="600"
          />
        </View>
      </View>
    </>
  );

  return (
    <Pressable
      onPress={onPress}
      style={
        fillParent
          ? { width: "100%", maxWidth: "100%", alignSelf: "stretch" }
          : { width: cardW, alignSelf: "center" }
      }
      onHoverIn={() => {
        if (Platform.OS === "web") setPhotoHovered(true);
      }}
      onHoverOut={() => {
        if (Platform.OS === "web") setPhotoHovered(false);
      }}
    >
      <View
        style={{
          width: "100%",
          aspectRatio: mediaAspectRatio,
          borderRadius: radii.lg,
          overflow: "hidden",
          borderWidth: StyleSheet.hairlineWidth,
          borderColor: colors.border,
          backgroundColor: colors.surfaceMuted,
          ...(fillParent && Platform.OS === "web"
            ? ({ boxSizing: "border-box" } as const)
            : null),
        }}
      >
        {auction.image_url ? (
          <Animated.View style={[StyleSheet.absoluteFill, photoAnimStyle]}>
            <ImageBackground
              source={{ uri: auction.image_url }}
              style={StyleSheet.absoluteFill}
              resizeMode="cover"
            >
              {media}
            </ImageBackground>
          </Animated.View>
        ) : (
          <View style={[StyleSheet.absoluteFill, { backgroundColor: colors.surfaceMuted }]}>
            {media}
          </View>
        )}
      </View>
    </Pressable>
  );
}
