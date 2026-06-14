import { Image, Pressable, View } from "react-native";
import { useState } from "react";
import { Ionicons } from "@expo/vector-icons";
import { colors, radii, space } from "@/src/theme/tokens";
import { AuctionCountdownBadge } from "./AuctionCountdownBadge";
import { TextCaption } from "./TextCaption";

type Props = {
  imageUrls: string[];
  /** Hero height (default 260). */
  height?: number;
  /** Neon “LIVE” pill (e.g. active auction). */
  showLiveBadge?: boolean;
  /** When set with an active auction, Stitch-style countdown top-right. */
  endsAt?: string | null;
};

export function AuctionImageCarousel({
  imageUrls,
  height = 260,
  showLiveBadge,
  endsAt,
}: Props) {
  const [idx, setIdx] = useState(0);
  if (!imageUrls.length) {
    return (
      <View
        style={{
          height,
          backgroundColor: colors.surfaceMuted,
          overflow: "hidden",
        }}
      />
    );
  }
  const uri = imageUrls[idx % imageUrls.length];
  return (
    <View style={{ overflow: "hidden", position: "relative" }}>
      <Image
        source={{ uri }}
        style={{ width: "100%", height }}
        resizeMode="cover"
      />
      {showLiveBadge ? (
        <View
          style={{
            position: "absolute",
            top: space.md,
            left: space.md,
            flexDirection: "row",
            alignItems: "center",
            gap: 6,
            backgroundColor: colors.accent,
            paddingHorizontal: space.md,
            paddingVertical: space.xs,
            borderRadius: radii.pill,
          }}
        >
          <View
            style={{
              width: 8,
              height: 8,
              borderRadius: 4,
              backgroundColor: colors.primary,
            }}
          />
          <TextCaption style={{ color: colors.primary, fontWeight: "600" }}>
            LIVE
          </TextCaption>
        </View>
      ) : null}
      {showLiveBadge && endsAt ? (
        <AuctionCountdownBadge endsAt={endsAt} active maxWidth="52%" inset={space.md} />
      ) : null}
      {imageUrls.length > 1 ? (
        <View
          pointerEvents="box-none"
          style={{
            position: "absolute",
            left: 0,
            right: 0,
            bottom: space.md,
            flexDirection: "row",
            justifyContent: "space-between",
            paddingHorizontal: space.md,
          }}
        >
          <Pressable
            onPress={() => setIdx((i) => (i - 1 + imageUrls.length) % imageUrls.length)}
            style={{
              width: 44,
              height: 44,
              borderRadius: 22,
              backgroundColor: "rgba(10,10,15,0.55)",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Ionicons name="chevron-back" size={22} color={colors.white} />
          </Pressable>
          <Pressable
            onPress={() => setIdx((i) => (i + 1) % imageUrls.length)}
            style={{
              width: 44,
              height: 44,
              borderRadius: 22,
              backgroundColor: "rgba(10,10,15,0.55)",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Ionicons name="chevron-forward" size={22} color={colors.white} />
          </Pressable>
        </View>
      ) : null}
    </View>
  );
}
