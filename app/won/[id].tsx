import { useMemo } from "react";
import { View } from "react-native";
import { useLocalSearchParams, router, type Href } from "expo-router";
import { useAuth } from "@/src/providers/AuthProvider";
import { useAuctionDetail } from "@/src/data/auctions";
import { Screen } from "@/src/components/ui/Screen";
import { TextTitle } from "@/src/components/ui/TextTitle";
import { TextBody } from "@/src/components/ui/TextBody";
import { TextCaption } from "@/src/components/ui/TextCaption";
import { ButtonPrimary } from "@/src/components/ui/ButtonPrimary";
import { ValueCurrency } from "@/src/components/ui/ValueCurrency";
import { space } from "@/src/theme/tokens";

export default function WonAuctionDetailScreen() {
  const params = useLocalSearchParams<{ id: string | string[] }>();
  const id =
    typeof params.id === "string"
      ? params.id
      : Array.isArray(params.id)
        ? params.id[0] ?? ""
        : "";
  const { session } = useAuth();
  const { data: row, isPending, isError, error } = useAuctionDetail(id);

  const isWinner = useMemo(() => {
    if (!session || !row) return false;
    return String((row as Record<string, unknown>).winner_id ?? "") === session.user.id;
  }, [row, session]);

  if (!id) {
    return (
      <Screen scroll>
        <TextBody>Invalid link.</TextBody>
      </Screen>
    );
  }

  if (isError) {
    return (
      <Screen scroll>
        <TextTitle>Could not load</TextTitle>
        <TextBody style={{ marginTop: space.md }}>
          {error instanceof Error ? error.message : "Something went wrong."}
        </TextBody>
      </Screen>
    );
  }

  if (!isPending && !row) {
    return (
      <Screen scroll>
        <TextTitle>Not found</TextTitle>
        <TextBody style={{ marginTop: space.md }}>This auction could not be loaded.</TextBody>
      </Screen>
    );
  }

  if (isPending) {
    return (
      <Screen scroll>
        <TextBody>Loading…</TextBody>
      </Screen>
    );
  }

  if (!isWinner) {
    return (
      <Screen scroll>
        <TextTitle>Not your win</TextTitle>
        <TextBody style={{ marginTop: space.md }}>
          This auction is not in your won list.
        </TextBody>
      </Screen>
    );
  }

  const r = row as Record<string, unknown>;
  const title = String(r.title ?? "");
  const status = String(r.status ?? "");
  const payment = String(r.payment_instructions ?? "");
  const bid = Number(r.current_highest_bid ?? 0);

  return (
    <Screen scroll>
      <TextTitle>{title}</TextTitle>
      <TextCaption style={{ marginTop: space.sm }}>{status}</TextCaption>
      <View style={{ marginTop: space.lg }}>
        <TextCaption>Winning bid</TextCaption>
        <ValueCurrency amount={bid} size="hero" />
      </View>
      <TextTitle style={{ marginTop: space.xl, fontSize: 18 }}>Payment</TextTitle>
      <TextBody style={{ marginTop: space.sm }}>{payment || "Follow seller instructions in the listing."}</TextBody>
      <ButtonPrimary
        title="Open full listing"
        onPress={() => router.push(`/auction/${id}` as Href)}
        style={{ marginTop: space.xl }}
      />
    </Screen>
  );
}
