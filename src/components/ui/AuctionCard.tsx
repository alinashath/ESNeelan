import { Image, Pressable, View, Text } from "react-native";
import { accentWash, accentWashDeep, colors, fontFamilies, radii, space, shadows, typography } from "@/src/theme/tokens";
import { TextCaption } from "./TextCaption";
import { ValueCurrency } from "./ValueCurrency";
import { AuctionCountdownBadge } from "./AuctionCountdownBadge";
import { isAuctionLiveForUi } from "@/src/lib/auction-live";

export type AuctionCardAuction = {
  id: string;
  title: string;
  status: string;
  ends_at: string;
  current_highest_bid: number | null;
  starting_price: number;
  bid_count: number;
  image_url?: string | null;
  /** Optional one-line preview (Explore list). */
  description?: string | null;
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

const IMAGE_PLACEHOLDER = "#E8E6E1";

export function AuctionCard({ auction, onPress, compact, inGrid }: Props) {
  const bid = auction.current_highest_bid ?? auction.starting_price;
  const liveUi = isAuctionLiveForUi(auction.status, auction.ends_at);
  const urgent = liveUi && endingSoon(auction.ends_at);
  const imgH = compact ? 160 : 200;
  const desc = (auction.description ?? "").trim();
  const padH = compact ? space.lg : space.xxxl;
  const padV = compact ? space.md : space.xxl;

  return (
    <View
      style={{
        borderRadius: radii.md,
        overflow: "hidden",
        borderWidth: 1,
        borderColor: colors.border,
        marginBottom: inGrid ? 0 : space.lg,
        backgroundColor: colors.surfaceMuted,
        ...shadows.card,
      }}
    >
      <Pressable
        onPress={onPress}
        accessibilityRole="button"
        accessibilityLabel={`${auction.title}. ${liveUi ? "Live auction" : auction.status}`}
        android_ripple={{ color: accentWash }}
        style={({ pressed }) => ({ opacity: pressed ? 0.96 : 1 })}
      >
        <View>
          {auction.image_url ? (
            <Image
              source={{ uri: auction.image_url }}
              style={{ width: "100%", height: imgH }}
              resizeMode="cover"
            />
          ) : (
            <View style={{ width: "100%", height: imgH, backgroundColor: IMAGE_PLACEHOLDER }} />
          )}

          {liveUi ? (
            <>
              <View
                style={{
                  position: "absolute",
                  top: space.sm,
                  left: space.sm,
                  backgroundColor: urgent ? "rgba(232,85,85,0.12)" : "rgba(46,204,138,0.12)",
                  paddingHorizontal: space.md,
                  paddingVertical: 6,
                  borderRadius: radii.pill,
                  borderWidth: 1,
                  borderColor: urgent ? "rgba(232,85,85,0.3)" : "rgba(46,204,138,0.3)",
                }}
              >
                <Text
                  style={{
                    color: urgent ? colors.danger : colors.success,
                    fontWeight: "600",
                    fontSize: 10,
                    letterSpacing: 1.2,
                    fontFamily: fontFamilies.bodySemiBold,
                  }}
                >
                  {urgent ? "ENDING SOON" : "LIVE"}
                </Text>
              </View>
              <AuctionCountdownBadge
                endsAt={auction.ends_at}
                active
                inset={space.md}
                maxWidth="55%"
                urgent={urgent}
              />
            </>
          ) : null}
        </View>

        <View style={{ paddingHorizontal: padH, paddingVertical: padV }}>
          <Text style={[typography.cardTitle, { fontSize: compact ? 14 : 16 }]} numberOfLines={2}>
            {auction.title}
          </Text>
          {desc ? (
            <TextCaption style={{ marginTop: space.xs, opacity: 0.9 }} numberOfLines={2}>
              {desc}
            </TextCaption>
          ) : null}
          <View
            style={{
              height: 1,
              backgroundColor: colors.border,
              marginVertical: compact ? space.md : space.lg,
            }}
          />
          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-end" }}>
            <View>
              <TextCaption
                style={{
                  fontSize: 10,
                  fontWeight: "600",
                  letterSpacing: 1.2,
                  color: colors.textMuted,
                  fontFamily: fontFamilies.bodySemiBold,
                }}
              >
                CURRENT BID
              </TextCaption>
              <View style={{ marginTop: space.xs }}>
                <ValueCurrency amount={bid} />
              </View>
            </View>
            <View style={{ alignItems: "flex-end" }}>
              <TextCaption
                style={{
                  fontSize: 10,
                  fontWeight: "600",
                  letterSpacing: 1.2,
                  color: colors.textMuted,
                  fontFamily: fontFamilies.bodySemiBold,
                }}
              >
                BIDS
              </TextCaption>
              <Text
                style={{
                  marginTop: space.xs,
                  fontSize: 15,
                  fontWeight: "600",
                  color: colors.text,
                  fontFamily: fontFamilies.bodySemiBold,
                }}
              >
                {auction.bid_count}{" "}
                <Text style={{ fontWeight: "500", color: colors.textSecondary }}>
                  {auction.bid_count === 1 ? "bid" : "bids"}
                </Text>
              </Text>
            </View>
          </View>
        </View>
      </Pressable>

      <Pressable
        onPress={onPress}
        accessibilityRole="button"
        accessibilityLabel={
          liveUi
            ? `Place bid on ${auction.title}`
            : `View details for ${auction.title}`
        }
        android_ripple={{ color: accentWashDeep }}
        style={({ pressed }) => ({
          backgroundColor: liveUi ? colors.accent : "transparent",
          borderTopWidth: liveUi ? 0 : 1,
          borderTopColor: colors.border,
          minHeight: compact ? 44 : 52,
          paddingVertical: compact ? space.sm : space.md,
          alignItems: "center",
          justifyContent: "center",
          flexDirection: "row",
          gap: space.sm,
          opacity: pressed ? 0.92 : 1,
        })}
      >
        {liveUi ? (
          <Text
            style={{
              color: colors.onAccent,
              fontWeight: "600",
              fontSize: compact ? 13 : 14,
              letterSpacing: 0.8,
              fontFamily: fontFamilies.bodySemiBold,
            }}
          >
            PLACE BID
          </Text>
        ) : (
          <Text
            style={{
              color: colors.textMuted,
              fontWeight: "600",
              fontSize: compact ? 13 : 14,
              letterSpacing: 0.6,
              fontFamily: fontFamilies.bodyMedium,
            }}
          >
            VIEW DETAILS
          </Text>
        )}
      </Pressable>
    </View>
  );
}
