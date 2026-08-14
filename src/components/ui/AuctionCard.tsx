import { isAuctionLiveForUi, isAuctionSoldForUi } from "@/src/lib/auction-live";
import {
    durationPhotoHoverMs,
    durationPressInMs,
    durationPressOutMs,
    easingEnter,
    easingPhotoHover,
} from "@/src/lib/ui-motion";
import {
    accentWash,
    colors,
    radii,
    space,
    typography,
} from "@/src/theme/tokens";
import { useEffect, useState } from "react";
import { Link, type Href } from "expo-router";
import { Platform, Pressable, StyleSheet, Text, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import Animated, {
    useAnimatedStyle,
    useReducedMotion,
    useSharedValue,
    withTiming,
} from "react-native-reanimated";
import { AuctionCountdownBadge } from "./AuctionCountdownBadge";
import { AuctionSoldBookmark } from "./AuctionSoldBookmark";
import { ContainedListingPhoto } from "./ContainedListingPhoto";
import { ValueCurrency } from "./ValueCurrency";

export type AuctionCardAuction = {
  id: string;
  title: string;
  status: string;
  ends_at: string;
  current_highest_bid: number | null;
  starting_price: number;
  bid_count: number;
  image_url?: string | null;
  /** @deprecated List cards do not render description; kept for callers / mapping. */
  description?: string | null;
  /** @deprecated List cards omit condition; detail page shows formatted condition. */
  item_condition_label?: string | null;
  /** @deprecated List cards omit attribute chips; detail page shows structured facts. */
  listing_detail_chip_labels?: string[];
};

type Props = {
  auction: AuctionCardAuction;
  onPress?: () => void;
  href?: Href;
  compact?: boolean;
  /** Multi-column lists: no outer bottom margin (row gap handled by parent). */
  inGrid?: boolean;
};

function endingSoon(endsAt: string) {
  const ms = new Date(endsAt).getTime() - Date.now();
  return ms > 0 && ms < 3600 * 1000;
}

const PHOTO_HOVER_SCALE = 1.06;

export function AuctionCard({ auction, onPress, href, compact, inGrid }: Props) {
  const bid = auction.current_highest_bid ?? auction.starting_price;
  const liveUi = isAuctionLiveForUi(auction.status, auction.ends_at);
  const soldUi = isAuctionSoldForUi(auction.status);
  const urgent = liveUi && endingSoon(auction.ends_at);
  const showClosedOnImage =
    !soldUi && String(auction.status).trim().toLowerCase() === "active" && !liveUi;
  const reducedMotion = useReducedMotion();
  const scale = useSharedValue(1);
  const cardAnim = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

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

  const pressIn = () => {
    if (reducedMotion) return;
    scale.value = withTiming(0.975, {
      duration: durationPressInMs,
      easing: easingEnter,
    });
  };
  const pressOut = () => {
    if (reducedMotion) return;
    scale.value = withTiming(1, {
      duration: durationPressOutMs,
      easing: easingEnter,
    });
  };

  const showCountdownOnCard = liveUi && !compact;

  const statusOverlay =
    soldUi || showClosedOnImage ? <AuctionSoldBookmark /> : null;

  const imageBlock = (
    <ContainedListingPhoto
      uri={auction.image_url}
      aspectRatio={compact ? 4 / 5 : 4 / 3}
      photoAnimStyle={photoAnimStyle}
      borderRadius={0}
      showBorder={false}
    >
      <LinearGradient
        pointerEvents="none"
        colors={[
          "rgba(0,0,0,0)",
          "rgba(0,0,0,0.03)",
          "rgba(0,0,0,0.12)",
          "rgba(0,0,0,0.3)",
          "rgba(0,0,0,0.64)",
        ]}
        locations={[0.18, 0.42, 0.62, 0.8, 1]}
        style={StyleSheet.absoluteFill}
      />
      {statusOverlay}
      {showCountdownOnCard ? (
        <AuctionCountdownBadge
          endsAt={auction.ends_at}
          active
          inset={space.md}
          maxWidth="55%"
          urgent={urgent}
        />
      ) : null}
      <View
        pointerEvents="none"
        style={{
          position: "absolute",
          left: space.md,
          right: space.md,
          bottom: space.md,
        }}
      >
        <View style={styles.cardCopy}>
          <Text
            style={[
              typography.cardTitle,
              styles.cardTitle,
              compact ? styles.cardTitleCompact : styles.cardTitleRegular,
            ]}
            numberOfLines={1}
            ellipsizeMode="tail"
          >
            {auction.title}
          </Text>
          <ValueCurrency
            amount={bid}
            size="sm"
            layout="inline"
            amountColor={colors.white}
            amountFontWeight="600"
          />
        </View>
      </View>
    </ContainedListingPhoto>
  );

  const cardVisual = (
    <Animated.View
      style={StyleSheet.flatten([
        {
          borderRadius: radii.lg,
          borderCurve: "continuous",
          overflow: "hidden",
          marginBottom: inGrid ? 0 : space.lg,
          backgroundColor: colors.white,
          borderWidth: StyleSheet.hairlineWidth,
          borderColor: colors.border,
        },
        cardAnim,
      ])}
    >
      {imageBlock}
    </Animated.View>
  );

  const card = (
    <Pressable
      onPress={onPress}
      onPressIn={pressIn}
      onPressOut={pressOut}
      onHoverIn={() => {
        if (Platform.OS === "web") setPhotoHovered(true);
      }}
      onHoverOut={() => {
        if (Platform.OS === "web") setPhotoHovered(false);
      }}
      accessibilityRole="button"
      accessibilityLabel={`${auction.title}. ${liveUi ? "Live auction" : auction.status}`}
      android_ripple={{ color: accentWash }}
      style={({ pressed }) => ({ opacity: pressed ? 0.96 : 1 })}
    >
      {cardVisual}
    </Pressable>
  );

  if (href) {
    return (
      <Link href={href} asChild>
        <Link.AppleZoom>{card}</Link.AppleZoom>
      </Link>
    );
  }

  return card;
}

const styles = StyleSheet.create({
  cardCopy: {
    width: "100%",
    minWidth: 0,
    gap: space.xs,
  },
  cardTitle: {
    color: colors.white,
    fontWeight: "400",
  },
  cardTitleCompact: {
    fontSize: 14,
    lineHeight: 18,
  },
  cardTitleRegular: {
    fontSize: 16,
    lineHeight: 21,
  },
});
