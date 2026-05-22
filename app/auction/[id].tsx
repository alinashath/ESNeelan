import { useCallback, useEffect, useMemo, useState } from "react";
import { Alert, View } from "react-native";
import { useLocalSearchParams, router } from "expo-router";
import { supabase } from "@/src/lib/supabase";
import { useAuth } from "@/src/providers/AuthProvider";
import { useAuctionDetail, useAuctionBids } from "@/src/data/auctions";
import { useQueryClient } from "@tanstack/react-query";
import { Screen } from "@/src/components/ui/Screen";
import { AuctionImageCarousel } from "@/src/components/ui/AuctionImageCarousel";
import { TextBody } from "@/src/components/ui/TextBody";
import { TextCaption } from "@/src/components/ui/TextCaption";
import { TextTitle } from "@/src/components/ui/TextTitle";
import { ValueCurrency } from "@/src/components/ui/ValueCurrency";
import { Countdown } from "@/src/components/ui/Countdown";
import { BidHistoryList } from "@/src/components/ui/BidHistoryList";
import { SellerCard } from "@/src/components/ui/SellerCard";
import { ButtonPrimary } from "@/src/components/ui/ButtonPrimary";
import { NumericStepper } from "@/src/components/ui/NumericStepper";
import { Badge } from "@/src/components/ui/Badge";
import { space } from "@/src/theme/tokens";

type AuctionDetail = {
  id: string;
  title: string;
  description: string;
  location: string;
  status: string;
  ends_at: string;
  seller_id: string;
  starting_price: number;
  min_bid_increment: number;
  current_highest_bid: number | null;
  payment_instructions: string | null;
  winner_id: string | null;
  categories?: { name: string } | null;
  image_urls: string[];
  seller: { id: string; display_name: string | null } | null;
};

export default function AuctionDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { session, profile } = useAuth();
  const qc = useQueryClient();
  const { data: row, refetch } = useAuctionDetail(id);
  const { data: bids, refetch: refetchBids } = useAuctionBids(id);
  const [bidAmount, setBidAmount] = useState(0);

  const a = row as unknown as AuctionDetail | null | undefined;

  const minNext = useMemo(() => {
    if (!a) return 0;
    const cur = a.current_highest_bid;
    const start = Number(a.starting_price);
    const inc = Number(a.min_bid_increment);
    if (cur == null) return start;
    return Number(cur) + inc;
  }, [a]);

  const step = a ? Number(a.min_bid_increment) : 1;

  useEffect(() => {
    if (minNext) setBidAmount(minNext);
  }, [minNext]);

  useEffect(() => {
    if (!id) return;
    const ch = supabase
      .channel(`auction-${id}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "auctions", filter: `id=eq.${id}` },
        () => {
          refetch();
        },
      )
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "bids",
          filter: `auction_id=eq.${id}`,
        },
        () => {
          refetch();
          refetchBids();
          qc.invalidateQueries({ queryKey: ["auctions"] });
        },
      )
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [id, qc, refetch, refetchBids]);

  const placeBid = useCallback(async () => {
    if (!session) {
      router.push("/(auth)/login");
      return;
    }
    if (profile?.suspended_at) {
      Alert.alert("Suspended", "You cannot bid while suspended.");
      return;
    }
    const { data, error } = await supabase.rpc("place_bid", {
      p_auction_id: id,
      p_amount: bidAmount,
    });
    if (error) {
      Alert.alert("Bid", error.message);
      return;
    }
    const res = data as { ok?: boolean; error?: string; min_required?: number };
    if (!res?.ok) {
      Alert.alert(
        "Bid not accepted",
        res?.error === "below_min"
          ? `Minimum required: ${res.min_required}`
          : res?.error ?? "Unknown",
      );
      return;
    }
    await refetch();
    await refetchBids();
  }, [bidAmount, id, profile?.suspended_at, refetch, refetchBids, session]);

  if (!a) {
    return (
      <Screen scroll>
        <TextBody>Loading or not found.</TextBody>
      </Screen>
    );
  }

  const title = a.title;
  const desc = a.description ?? "";
  const loc = a.location ?? "";
  const status = a.status;
  const endsAt = a.ends_at;
  const sellerId = a.seller_id;
  const sellerName = a.seller?.display_name ?? "Seller";
  const cat = a.categories?.name ?? "";
  const payment = a.payment_instructions ?? "";
  const winnerId = a.winner_id;
  const imageUrls = a.image_urls ?? [];

  const isSeller = session?.user.id === sellerId;

  return (
    <Screen scroll>
      <AuctionImageCarousel imageUrls={imageUrls} />
      {cat ? (
        <View style={{ marginTop: space.md }}>
          <Badge title={cat.toUpperCase()} variant="neutral" />
        </View>
      ) : null}
      <TextTitle style={{ marginTop: space.sm }}>{title}</TextTitle>
      <View style={{ marginTop: space.sm, flexDirection: "row", alignItems: "center" }}>
        <TextCaption style={{ marginRight: space.sm }}>Current bid</TextCaption>
        <ValueCurrency
          amount={a.current_highest_bid ?? Number(a.starting_price)}
        />
      </View>
      {status === "active" ? (
        <View style={{ marginTop: space.sm }}>
          <Countdown endsAt={endsAt} />
        </View>
      ) : (
        <TextCaption style={{ marginTop: space.sm }}>Status: {status}</TextCaption>
      )}

      {status === "active" && !isSeller && session ? (
        <View style={{ marginTop: space.lg }}>
          <TextCaption style={{ marginBottom: space.sm }}>YOUR BID (MVR)</TextCaption>
          <NumericStepper
            value={bidAmount}
            min={minNext}
            step={step}
            onChange={setBidAmount}
          />
          <ButtonPrimary title="PLACE BID" onPress={placeBid} style={{ marginTop: space.lg }} />
        </View>
      ) : null}

      {isSeller ? (
        <TextCaption style={{ marginTop: space.md }}>This is your listing.</TextCaption>
      ) : null}

      <TextTitle style={{ marginTop: space.xl }}>Description</TextTitle>
      <TextBody style={{ marginTop: space.sm }}>{desc}</TextBody>
      <TextTitle style={{ marginTop: space.lg }}>Location</TextTitle>
      <TextBody style={{ marginTop: space.sm }}>{loc || "—"}</TextBody>

      <TextTitle style={{ marginTop: space.lg }}>Bid history</TextTitle>
      <BidHistoryList bids={bids ?? []} />

      <TextTitle style={{ marginTop: space.lg }}>Seller</TextTitle>
      <View style={{ marginTop: space.sm }}>
        <SellerCard displayName={sellerName} />
      </View>

      {winnerId === session?.user.id &&
      ["won", "paid"].includes(status) &&
      payment ? (
        <View style={{ marginTop: space.xl }}>
          <TextTitle>Payment instructions</TextTitle>
          <TextBody style={{ marginTop: space.sm }}>{payment}</TextBody>
        </View>
      ) : null}

      <View style={{ marginTop: space.xl, padding: space.md, backgroundColor: "#f5f5f5" }}>
        <TextCaption style={{ fontWeight: "700" }}>BUYER PROTECTION</TextCaption>
        <TextBody style={{ marginTop: space.sm }}>
          Complete payment using seller instructions. Seller confirms receipt; admin can mark the
          auction completed.
        </TextBody>
      </View>
    </Screen>
  );
}
