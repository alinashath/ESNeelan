import { useMemo } from "react";
import { Alert, Image, View } from "react-native";
import { useLocalSearchParams, router, type Href } from "expo-router";
import { supabase } from "@/src/lib/supabase";
import { useAuth } from "@/src/providers/AuthProvider";
import { useAuctionDetail } from "@/src/data/auctions";
import { Screen } from "@/src/components/ui/Screen";
import { TextTitle } from "@/src/components/ui/TextTitle";
import { TextBody } from "@/src/components/ui/TextBody";
import { TextCaption } from "@/src/components/ui/TextCaption";
import { ButtonPrimary } from "@/src/components/ui/ButtonPrimary";
import { ButtonSecondary } from "@/src/components/ui/ButtonSecondary";
import { Badge } from "@/src/components/ui/Badge";
import { CommunicationCodeCard } from "@/src/components/ui/CommunicationCodeCard";
import { ValueCurrency } from "@/src/components/ui/ValueCurrency";
import { auctionStatusLabel } from "@/src/lib/auction-status-label";
import { colors, radii, space } from "@/src/theme/tokens";
import { useQueryClient } from "@tanstack/react-query";

export default function MyAuctionDetailScreen() {
  const params = useLocalSearchParams<{ id: string | string[] }>();
  const id =
    typeof params.id === "string"
      ? params.id
      : Array.isArray(params.id)
        ? params.id[0] ?? ""
        : "";
  const { session } = useAuth();
  const qc = useQueryClient();
  const { data: row, isPending, isError, error, refetch } = useAuctionDetail(id);

  const isMine = useMemo(() => {
    if (!session || !row) return false;
    return String((row as Record<string, unknown>).seller_id ?? "") === session.user.id;
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
        <TextBody style={{ marginTop: space.md }}>
          This listing is missing or you do not have access.
        </TextBody>
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

  if (!isMine) {
    return (
      <Screen scroll>
        <TextTitle>Not your listing</TextTitle>
        <TextBody style={{ marginTop: space.md }}>You can only manage your own auctions here.</TextBody>
      </Screen>
    );
  }

  const r = row as Record<string, unknown>;
  const title = String(r.title ?? "");
  const status = String(r.status ?? "");
  const desc = String(r.description ?? "");
  const endsAt = String(r.ends_at ?? "");
  const imageUrls = (r.image_urls as string[] | undefined) ?? [];
  const cover = imageUrls[0];
  const bid = (r.current_highest_bid as number | null) ?? Number(r.starting_price);
  const bidNumber = (r.bid_number as string | null) ?? null;
  const commCode = (r.communication_code as string | null) ?? null;
  const bidType = String(r.bid_type ?? "standard");
  const feePending = Boolean(r.featured_listing_fee_pending);
  const listingFeePaid = Boolean(r.listing_fee_paid);

  async function openFeaturedFeeScreen() {
    const needRequest =
      (status === "draft" && bidType === "standard") ||
      (status === "active" && bidType === "standard" && !feePending);

    if (needRequest) {
      const { data: rpc, error } = await supabase.rpc("seller_request_featured_listing_fee", {
        p_auction_id: id,
      });
      if (error) {
        Alert.alert("Error", error.message);
        return;
      }
      if (rpc && typeof rpc === "object" && "ok" in rpc && rpc.ok === false) {
        Alert.alert("Error", String((rpc as { error?: string }).error));
        return;
      }
      await refetch();
    }
    router.push(`/my-auctions/featured-fee?id=${id}` as Href);
  }

  const showFeaturedFeeCta =
    (status === "draft" && (bidType === "standard" || bidType === "featured")) ||
    (status === "active" && bidType === "standard") ||
    (status === "active" && feePending);

  return (
    <Screen scroll>
      {cover ? (
        <Image
          source={{ uri: cover }}
          style={{
            width: "100%",
            height: 200,
            borderRadius: radii.lg,
            marginBottom: space.lg,
            backgroundColor: colors.surfaceMuted,
          }}
        />
      ) : null}
      <TextTitle>{title}</TextTitle>
      <View style={{ flexDirection: "row", gap: space.sm, marginTop: space.sm, flexWrap: "wrap" }}>
        <Badge title={bidType === "featured" ? "FEATURED" : "STANDARD"} variant="accent" />
        <TextCaption style={{ fontWeight: "600" }}>{auctionStatusLabel(status)}</TextCaption>
      </View>
      {status === "active" && feePending ? (
        <TextCaption style={{ marginTop: space.xs, color: colors.textSecondary }}>
          Featured listing fee: payment proof required (your listing stays live).
        </TextCaption>
      ) : null}
      <TextCaption style={{ marginTop: space.xs }}>Ends {new Date(endsAt).toLocaleString()}</TextCaption>
      <View style={{ marginTop: space.md }}>
        <TextCaption>Current bid</TextCaption>
        <ValueCurrency amount={bid} size="hero" />
      </View>
      {desc ? (
        <TextBody style={{ marginTop: space.lg }}>{desc}</TextBody>
      ) : null}

      {bidNumber || commCode ? (
        <View style={{ marginTop: space.lg }}>
          <CommunicationCodeCard bidNumber={bidNumber} communicationCode={commCode} />
        </View>
      ) : null}

      {status === "awaiting_payment" && bidType === "featured" ? (
        <TextCaption style={{ marginTop: space.lg, color: colors.textSecondary }}>
          Your featured listing fee proof is with admin for verification. You will be notified when it is
          processed.
        </TextCaption>
      ) : null}

      {showFeaturedFeeCta ? (
        <View style={{ marginTop: space.lg, gap: space.sm }}>
          {status === "draft" && bidType === "standard" ? (
            <ButtonPrimary title="Upgrade to featured listing (fee)" onPress={() => void openFeaturedFeeScreen()} />
          ) : null}
          {status === "draft" && bidType === "featured" ? (
            <ButtonPrimary title="Pay featured listing fee" onPress={() => void openFeaturedFeeScreen()} />
          ) : null}
          {status === "active" && bidType === "standard" && !feePending ? (
            <ButtonPrimary title="Request featured listing (fee)" onPress={() => void openFeaturedFeeScreen()} />
          ) : null}
          {status === "active" && feePending ? (
            <>
              <ButtonPrimary title="Upload listing fee proof" onPress={() => void openFeaturedFeeScreen()} />
              <ButtonSecondary
                title="Refresh status"
                onPress={() => {
                  void refetch();
                }}
              />
            </>
          ) : null}
        </View>
      ) : null}

      {status === "active" && bidType === "featured" && listingFeePaid && !feePending ? (
        <TextCaption style={{ marginTop: space.md, color: colors.textSecondary }}>
          This listing uses the featured tier (listing fee verified).
        </TextCaption>
      ) : null}

      {status === "payment_stage" ? (
        <ButtonPrimary
          title="Submit closure form"
          onPress={() => router.push(`/auction/closure/${id}` as Href)}
          style={{ marginTop: space.lg }}
        />
      ) : null}

      <ButtonPrimary
        title="View public listing"
        onPress={() => router.push(`/auction/${id}` as Href)}
        style={{ marginTop: space.xl }}
      />

      {status === "won" || status === "payment_stage" ? (
        <ButtonPrimary
          title="Mark paid (seller)"
          onPress={async () => {
            const { data: rpc, error } = await supabase.rpc("seller_mark_auction_paid", {
              p_auction_id: id,
            });
            if (error) Alert.alert("Error", error.message);
            else if (rpc && typeof rpc === "object" && "ok" in rpc && rpc.ok === false) {
              Alert.alert("Error", String((rpc as { error?: string }).error));
            } else {
              await refetch();
              qc.invalidateQueries({ queryKey: ["my-auctions"] });
              Alert.alert("Updated", "Marked as paid.");
            }
          }}
          style={{ marginTop: space.md }}
        />
      ) : null}
    </Screen>
  );
}
