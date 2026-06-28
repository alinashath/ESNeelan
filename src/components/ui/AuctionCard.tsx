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
    fontFamilies,
    palette,
    radii,
    space,
    typography,
} from "@/src/theme/tokens";
import { useEffect, useState } from "react";
import {
    Image,
    Platform,
    Pressable,
    StyleSheet,
    Text,
    View,
} from "react-native";
import Animated, {
    useAnimatedStyle,
    useReducedMotion,
    useSharedValue,
    withTiming,
} from "react-native-reanimated";
import { AuctionCountdownBadge } from "./AuctionCountdownBadge";
import { AuctionSoldBookmark } from "./AuctionSoldBookmark";
import { TextCaption } from "./TextCaption";
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
  onPress: () => void;
  compact?: boolean;
  /** Multi-column lists: no outer bottom margin (row gap handled by parent). */
  inGrid?: boolean;
};

function endingSoon(endsAt: string) {
  const ms = new Date(endsAt).getTime() - Date.now();
  return ms > 0 && ms < 3600 * 1000;
}

const IMAGE_PLACEHOLDER = palette.dividerSoft;
const PHOTO_HOVER_SCALE = 1.06;

export function AuctionCard({ auction, onPress, compact, inGrid }: Props) {
  const bid = auction.current_highest_bid ?? auction.starting_price;
  const liveUi = isAuctionLiveForUi(auction.status, auction.ends_at);
  const soldUi = isAuctionSoldForUi(auction.status);
  const urgent = liveUi && endingSoon(auction.ends_at);
  const showClosedOnImage =
    !soldUi && String(auction.status).trim().toLowerCase() === "active" && !liveUi;
  const imgH = compact ? 160 : 200;
  const padH = compact ? space.sm : space.xxxl;
  const padTop = compact ? space.sm : space.lg;
  const padBottom = compact ? space.md : space.xxl;
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
    scale.value = withTiming(0.99, {
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

  const priceRowLabel = soldUi ? null : showClosedOnImage ? "Sold" : "Current bid";

  const livePill = liveUi ? (
    <View
      style={{
        position: "absolute",
        top: space.sm,
        left: space.sm,
        backgroundColor: urgent ? colors.danger : colors.success,
        paddingHorizontal: space.md,
        paddingVertical: 6,
        borderRadius: radii.pill,
      }}
    >
      <Text
        style={{
          color: colors.white,
          fontWeight: "600",
          fontSize: 10,
          letterSpacing: 0.8,
          fontFamily: fontFamilies.body,
        }}
      >
        {urgent ? "ENDING SOON" : "LIVE"}
      </Text>
    </View>
  ) : soldUi ? (
    <AuctionSoldBookmark />
  ) : showClosedOnImage ? (
    <View
      style={{
        position: "absolute",
        top: space.sm,
        left: space.sm,
        backgroundColor: colors.surfaceMuted,
        borderWidth: 1,
        borderColor: colors.border,
        paddingHorizontal: space.md,
        paddingVertical: 6,
        borderRadius: radii.pill,
      }}
    >
      <Text
        style={{
          color: colors.textSecondary,
          fontWeight: "600",
          fontSize: 10,
          letterSpacing: 0.6,
          fontFamily: fontFamilies.body,
        }}
      >
        Closed
      </Text>
    </View>
  ) : null;

  const imageBlock = (
    <View
      style={{
        width: "100%",
        height: imgH,
        borderRadius: radii.md,
        overflow: "hidden",
        borderWidth: StyleSheet.hairlineWidth,
        borderColor: colors.border,
        backgroundColor: colors.surfaceMuted,
      }}
    >
      {auction.image_url ? (
        <Animated.View
          style={[{ width: "100%", height: "100%" }, photoAnimStyle]}
        >
          <Image
            source={{ uri: auction.image_url }}
            style={{ width: "100%", height: "100%" }}
            resizeMode="cover"
          />
        </Animated.View>
      ) : (
        <View
          style={{
            width: "100%",
            height: "100%",
            backgroundColor: IMAGE_PLACEHOLDER,
          }}
        />
      )}
      {livePill}
      {showCountdownOnCard ? (
        <AuctionCountdownBadge
          endsAt={auction.ends_at}
          active
          inset={space.md}
          maxWidth="55%"
          urgent={urgent}
        />
      ) : null}
    </View>
  );

  return (
    <Animated.View
      style={[
        {
          borderRadius: radii.md,
          overflow: "visible",
          marginBottom: inGrid ? 0 : space.lg,
          backgroundColor: "transparent",
        },
        cardAnim,
      ]}
    >
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
        <View>{imageBlock}</View>

        <View
          style={{
            paddingHorizontal: padH,
            paddingTop: padTop,
            paddingBottom: padBottom,
          }}
        >
          <Text
            style={[
              typography.cardTitle,
              {
                fontSize: compact ? 15 : 17,
                lineHeight: compact ? 20 : 22,
                fontWeight: "600",
              },
            ]}
            numberOfLines={2}
          >
            {auction.title}
          </Text>

          {soldUi ? null : priceRowLabel ? (
            <TextCaption
              style={{
                marginTop: space.xs,
                fontSize: 12,
                fontWeight: "400",
                letterSpacing: 0.2,
                color: colors.textMuted,
                fontFamily: fontFamilies.body,
              }}
            >
              {priceRowLabel}
            </TextCaption>
          ) : null}

          <View
            style={{
              marginTop: space.sm,
              flexDirection: "row",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <ValueCurrency
              amount={bid}
              size={compact ? "compact" : "default"}
              layout="inline"
              amountFontWeight="600"
            />
            <Text
              style={{
                fontSize: compact ? 13 : 14,
                fontWeight: "400",
                color: colors.textSecondary,
                fontFamily: fontFamilies.body,
              }}
            >
              {auction.bid_count} {auction.bid_count === 1 ? "bid" : "bids"}
            </Text>
          </View>
        </View>
      </Pressable>
    </Animated.View>
  );
}
