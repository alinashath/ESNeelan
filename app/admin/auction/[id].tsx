import { View } from "react-native";
import { useLocalSearchParams, router, type Href } from "expo-router";
import { useAuctionDetail, useAuctionBids } from "@/src/data/auctions";
import { Screen } from "@/src/components/ui/Screen";
import { TextTitle } from "@/src/components/ui/TextTitle";
import { TextBody } from "@/src/components/ui/TextBody";
import { TextCaption } from "@/src/components/ui/TextCaption";
import { ButtonPrimary } from "@/src/components/ui/ButtonPrimary";
import { ValueCurrency } from "@/src/components/ui/ValueCurrency";
import { auctionStatusLabel } from "@/src/lib/auction-status-label";
import { space } from "@/src/theme/tokens";

export default function AdminAuctionDetailScreen() {
  const params = useLocalSearchParams<{ id: string | string[] }>();
  const id =
    typeof params.id === "string"
      ? params.id
      : Array.isArray(params.id)
        ? params.id[0] ?? ""
        : "";
  const { data: row, isPending } = useAuctionDetail(id);
  const { data: bids } = useAuctionBids(id);

  if (!id) {
    return (
      <Screen scroll>
        <TextBody>Invalid link.</TextBody>
      </Screen>
    );
  }

  if (isPending || !row) {
    return (
      <Screen scroll>
        <TextBody>Loading…</TextBody>
      </Screen>
    );
  }

  const r = row as Record<string, unknown>;
  const title = String(r.title ?? "");
  const status = String(r.status ?? "");
  const endsAt = (r.ends_at as string | null | undefined) ?? undefined;
  const seller = r.seller as { display_name: string | null } | null;
  const bid = (r.current_highest_bid as number | null) ?? Number(r.starting_price);
  const winnerId = (r.winner_id as string | null) ?? null;

  return (
    <Screen scroll>
      <TextTitle>{title}</TextTitle>
      <TextCaption style={{ marginTop: space.sm }}>
        {auctionStatusLabel(status, endsAt)}
      </TextCaption>
      <TextCaption style={{ marginTop: space.xs }}>
        Seller: {seller?.display_name ?? String(r.seller_id ?? "").slice(0, 8)}
      </TextCaption>
      <View style={{ marginTop: space.md }}>
        <TextCaption>Current high bid</TextCaption>
        <ValueCurrency amount={bid} size="hero" />
      </View>
      <TextCaption style={{ marginTop: space.md }}>Winner id: {winnerId ?? "—"}</TextCaption>
      <TextCaption style={{ marginTop: space.sm }}>
        Bid no: {String(r.bid_number ?? "—")} · Code: {String(r.communication_code ?? "—")}
      </TextCaption>

      <TextTitle style={{ marginTop: space.xl, fontSize: 18 }}>Recent bids</TextTitle>
      {(bids ?? []).slice(0, 12).map((b) => (
        <View
          key={b.id}
          style={{
            marginTop: space.sm,
            flexDirection: "row",
            flexWrap: "wrap",
            alignItems: "center",
            gap: 4,
          }}
        >
          <TextBody>{b.bidder_display} ·</TextBody>
          <ValueCurrency amount={b.amount} size="compact" />
        </View>
      ))}

      <ButtonPrimary
        title="Open shopper listing"
        onPress={() => router.push(`/auction/${id}` as Href)}
        style={{ marginTop: space.xl }}
      />
    </Screen>
  );
}
