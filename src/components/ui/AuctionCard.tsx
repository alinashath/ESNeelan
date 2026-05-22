import { Image, Pressable, View } from "react-native";
import { colors, radii, space } from "@/src/theme/tokens";
import { TextBody } from "./TextBody";
import { TextCaption } from "./TextCaption";
import { ValueCurrency } from "./ValueCurrency";
import { Countdown } from "./Countdown";
import { BadgeEndingSoon } from "./BadgeEndingSoon";

export type AuctionCardAuction = {
  id: string;
  title: string;
  status: string;
  ends_at: string;
  current_highest_bid: number | null;
  starting_price: number;
  bid_count: number;
  image_url?: string | null;
};

type Props = {
  auction: AuctionCardAuction;
  onPress: () => void;
  compact?: boolean;
};

function endingSoon(endsAt: string) {
  const ms = new Date(endsAt).getTime() - Date.now();
  return ms > 0 && ms < 3600 * 1000;
}

export function AuctionCard({ auction, onPress, compact }: Props) {
  const bid = auction.current_highest_bid ?? auction.starting_price;
  const showUrgent = auction.status === "active" && endingSoon(auction.ends_at);
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => ({
        borderRadius: radii.lg,
        overflow: "hidden",
        borderWidth: 1,
        borderColor: colors.border,
        opacity: pressed ? 0.92 : 1,
        marginBottom: space.lg,
      })}
    >
      {auction.image_url ? (
        <Image
          source={{ uri: auction.image_url }}
          style={{ width: "100%", height: compact ? 140 : 180 }}
        />
      ) : (
        <View
          style={{
            height: compact ? 140 : 180,
            backgroundColor: colors.surfaceMuted,
          }}
        />
      )}
      <View style={{ padding: space.md }}>
        <View
          style={{
            flexDirection: "row",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          {showUrgent ? <BadgeEndingSoon /> : null}
          {auction.status === "active" ? (
            <Countdown endsAt={auction.ends_at} />
          ) : (
            <TextCaption>{auction.status}</TextCaption>
          )}
        </View>
        <TextBody style={{ fontWeight: "700", marginTop: space.sm }} numberOfLines={2}>
          {auction.title}
        </TextBody>
        <View style={{ flexDirection: "row", marginTop: space.sm, alignItems: "center" }}>
          <TextCaption style={{ marginRight: space.sm }}>Current bid</TextCaption>
          <ValueCurrency amount={bid} />
        </View>
        <TextCaption style={{ marginTop: space.xs, color: colors.accent, fontWeight: "600" }}>
          {auction.bid_count} bids
        </TextCaption>
      </View>
    </Pressable>
  );
}
