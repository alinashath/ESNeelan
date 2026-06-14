import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Alert, Pressable, View } from "react-native";
import { useLocalSearchParams, router, type Href } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import Animated, { FadeInDown } from "react-native-reanimated";
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
import { BidHistoryCollapsible } from "@/src/components/ui/BidHistoryCollapsible";
import { SellerCard } from "@/src/components/ui/SellerCard";
import { ButtonPrimary } from "@/src/components/ui/ButtonPrimary";
import { NumericStepper } from "@/src/components/ui/NumericStepper";
import { Badge } from "@/src/components/ui/Badge";
import { Checkbox } from "@/src/components/ui/Checkbox";
import { CommunicationCodeCard } from "@/src/components/ui/CommunicationCodeCard";
import { colors, radii, shadows, space } from "@/src/theme/tokens";
import { auctionDetailStatusText, isAuctionLiveForUi } from "@/src/lib/auction-live";
import {
  BIDMASTER_WINNER_TERMS_VERSION,
  formatMaldivesPhoneDisplay,
  sellerHighBidderPendingConsentParagraphs,
  sellerPaymentStageParagraphs,
  winnerConsentRequestedParagraphs,
} from "@/src/lib/bidmaster-legal-copy";

export default function AuctionDetailScreen() {
  const params = useLocalSearchParams<{ id: string | string[] }>();
  const id =
    typeof params.id === "string"
      ? params.id
      : Array.isArray(params.id)
        ? params.id[0] ?? ""
        : "";

  const { session, profile } = useAuth();
  const qc = useQueryClient();
  const {
    data: row,
    isPending,
    isError,
    error,
    refetch,
  } = useAuctionDetail(id);
  const { data: bids, refetch: refetchBids } = useAuctionBids(id);
  const [bidAmount, setBidAmount] = useState(0);
  const [agreeWinnerTerms, setAgreeWinnerTerms] = useState(false);
  const [agreeShareContact, setAgreeShareContact] = useState(false);

  const refetchRef = useRef(refetch);
  const refetchBidsRef = useRef(refetchBids);
  const qcRef = useRef(qc);
  refetchRef.current = refetch;
  refetchBidsRef.current = refetchBids;
  qcRef.current = qc;

  const minNext = useMemo(() => {
    if (!row) return 0;
    const r = row as Record<string, unknown>;
    const cur = r.current_highest_bid as number | null;
    const start = Number(r.starting_price);
    const inc = Number(r.min_bid_increment);
    if (cur == null) return start;
    return Number(cur) + inc;
  }, [row]);

  const step = row ? Number((row as Record<string, unknown>).min_bid_increment) : 1;

  useEffect(() => {
    if (minNext) setBidAmount(minNext);
  }, [minNext]);

  useEffect(() => {
    if (!id) return;
    // Only depend on `id`: refetch/refetchBids identities change often and would re-run this
    // effect after subscribe(), causing "cannot add postgres_changes callbacks after subscribe()".
    const ch = supabase
      .channel(`auction-${id}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "auctions", filter: `id=eq.${id}` },
        () => {
          void refetchRef.current();
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
          void refetchRef.current();
          void refetchBidsRef.current();
          qcRef.current.invalidateQueries({ queryKey: ["auctions"] });
        },
      )
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [id]);

  const placeBid = useCallback(async () => {
    if (!id) return;
    if (!session) {
      router.push("/(auth)/login");
      return;
    }
    if (profile?.suspended_at) {
      Alert.alert("Suspended", "You cannot bid while suspended.");
      return;
    }
    const { data, error: rpcErr } = await supabase.rpc("place_bid", {
      p_auction_id: id,
      p_amount: bidAmount,
    });
    if (rpcErr) {
      Alert.alert("Bid", rpcErr.message);
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

  if (!id) {
    return (
      <Screen scroll>
        <TextBody>This auction link is invalid.</TextBody>
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

  if (isError) {
    return (
      <Screen scroll>
        <TextTitle>Could not load auction</TextTitle>
        <TextBody style={{ marginTop: space.md }}>
          {error instanceof Error ? error.message : "Something went wrong."}
        </TextBody>
      </Screen>
    );
  }

  if (!row) {
    return (
      <Screen scroll>
        <TextBody>This auction was not found or is no longer available.</TextBody>
      </Screen>
    );
  }

  const a = row as Record<string, unknown>;
  const title = String(a.title ?? "");
  const desc = String(a.description ?? "");
  const loc = String(a.location ?? "");
  const status = String(a.status ?? "");
  const endsAt = String(a.ends_at ?? "");
  const startsAt = (a.starts_at as string | null | undefined) ?? null;
  const sellerId = String(a.seller_id ?? "");
  const seller = a.seller as { display_name: string | null } | null;
  const sellerName = seller?.display_name ?? "Seller";
  const categoryLabels = (a.category_names as string[] | undefined) ?? [];
  const primaryCategory = categoryLabels[0];
  const payment = String(a.payment_instructions ?? "");
  const winnerId = (a.winner_id as string | null) ?? null;
  const bidNumber = (a.bid_number as string | null) ?? null;
  const communicationCode = (a.communication_code as string | null) ?? null;
  const sellerPhone = (a.seller_phone as string | null) ?? null;
  const winnerContactPhone = (a.winner_contact_phone as string | null) ?? null;
  const winnerPosition = Number(a.winner_position ?? 1);
  const imageUrls = (a.image_urls as string[] | undefined) ?? [];
  const bidCount = Number(a.bid_count ?? 0);
  const currentBid = (a.current_highest_bid as number | null) ?? Number(a.starting_price);
  const liveUi = isAuctionLiveForUi(status, endsAt);

  const winningAmountLabel = useMemo(
    () =>
      `${new Intl.NumberFormat(undefined, { maximumFractionDigits: 2 }).format(Number(currentBid))} MVR`,
    [currentBid],
  );
  const sellerPhoneDisplay = formatMaldivesPhoneDisplay(sellerPhone);
  const winnerContactDisplay = formatMaldivesPhoneDisplay(winnerContactPhone);

  const isSeller = session?.user.id === sellerId;
  const isWinner = !!session?.user.id && winnerId === session.user.id;

  const giveWinnerConsent = useCallback(async () => {
    if (!id) return;
    if (!agreeWinnerTerms || !agreeShareContact) {
      Alert.alert("Consent", "Please confirm both checkboxes.");
      return;
    }
    const { data, error: rpcErr } = await supabase.rpc("winner_give_consent", {
      p_auction_id: id,
      p_terms_version: BIDMASTER_WINNER_TERMS_VERSION,
    });
    if (rpcErr) {
      Alert.alert("Consent", rpcErr.message);
      return;
    }
    const res = data as { ok?: boolean; error?: string };
    if (!res?.ok) {
      Alert.alert("Consent", res?.error ?? "Could not record consent.");
      return;
    }
    await refetch();
    qc.invalidateQueries({ queryKey: ["won-auctions"] });
    Alert.alert("Thank you", "The seller can now contact you using your registered phone.");
  }, [agreeShareContact, agreeWinnerTerms, id, qc, refetch]);

  return (
    <Screen scroll noPadding>
      <AuctionImageCarousel
        imageUrls={imageUrls}
        height={320}
        showLiveBadge={liveUi}
        endsAt={liveUi ? endsAt : null}
      />

      <Animated.View
        entering={FadeInDown.duration(420).delay(70).springify().damping(22).stiffness(280)}
        style={{ paddingHorizontal: space.lg, marginTop: -28, zIndex: 1 }}
      >
        <View
          style={{
            backgroundColor: colors.background,
            borderRadius: radii.lg,
            padding: space.lg,
            borderWidth: 1,
            borderColor: colors.border,
            ...shadows.card,
          }}
        >
          {primaryCategory ? (
            <Badge title={primaryCategory.toUpperCase()} variant="accent" />
          ) : null}

          <TextTitle
            style={{
              marginTop: space.md,
              fontSize: 26,
              lineHeight: 32,
              fontWeight: "600",
              letterSpacing: -0.6,
            }}
          >
            {title}
          </TextTitle>

          <View
            style={{
              marginTop: space.lg,
              flexDirection: "row",
              gap: 0,
              alignItems: "stretch",
            }}
          >
            <View style={{ flex: 1, minWidth: 0, paddingRight: space.md }}>
              <TextCaption style={{ fontWeight: "600", letterSpacing: 0.8 }}>
                CURRENT BID
              </TextCaption>
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  gap: space.sm,
                  marginTop: space.sm,
                  minWidth: 0,
                }}
              >
                <View
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: radii.sm,
                    backgroundColor: colors.accent,
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                  }}
                >
                  <Ionicons name="cash-outline" size={20} color={colors.primary} />
                </View>
                <View style={{ flex: 1, minWidth: 0 }}>
                  <ValueCurrency amount={currentBid} size="hero" />
                </View>
              </View>
              <TextCaption style={{ marginTop: space.xs, fontWeight: "600" }}>
                {bidCount} {bidCount === 1 ? "bid" : "bids"} total
              </TextCaption>
            </View>
            {liveUi ? (
              <View
                style={{
                  flex: 1,
                  minWidth: 0,
                  paddingLeft: space.md,
                  borderLeftWidth: 1,
                  borderLeftColor: colors.border,
                }}
              >
                <Countdown variant="detail" endsAt={endsAt} startsAt={startsAt} />
              </View>
            ) : (
              <View style={{ flex: 1, paddingLeft: space.md, borderLeftWidth: 1, borderLeftColor: colors.border }}>
                <TextCaption style={{ fontWeight: "600" }}>STATUS</TextCaption>
                <TextBody style={{ marginTop: space.sm, fontWeight: "600" }}>
                  {auctionDetailStatusText(status, endsAt)}
                </TextBody>
              </View>
            )}
          </View>

          {isSeller &&
          bidNumber &&
          ["active", "awaiting_winner_consent", "payment_stage", "won", "paid", "completed"].includes(
            status,
          ) ? (
            <View style={{ marginTop: space.lg }}>
              <CommunicationCodeCard
                bidNumber={bidNumber}
                communicationCode={communicationCode}
              />
            </View>
          ) : null}

          {isSeller && status === "awaiting_winner_consent" ? (
            <View style={{ marginTop: space.lg, padding: space.md, backgroundColor: colors.surfaceMuted, borderRadius: radii.md }}>
              <TextCaption style={{ fontWeight: "600" }}>Awaiting winner consent</TextCaption>
              {sellerHighBidderPendingConsentParagraphs({
                itemName: title,
                bidNumber: bidNumber,
                winningAmountLabel,
              }).map((para, i) => (
                <TextBody
                  key={`sv-pend-${i}`}
                  style={{ marginTop: i === 0 ? space.sm : space.xs, color: colors.textSecondary }}
                >
                  {para}
                </TextBody>
              ))}
            </View>
          ) : null}

          {isSeller && status === "payment_stage" ? (
            <View style={{ marginTop: space.lg, gap: space.sm }}>
              <TextTitle style={{ fontSize: 18 }}>Winner contact</TextTitle>
              <TextBody>
                Phone:{" "}
                <TextBody style={{ fontWeight: "600" }}>
                  {winnerContactPhone ? winnerContactDisplay : "—"}
                </TextBody>
              </TextBody>
              <TextCaption>Position: {winnerPosition}</TextCaption>
              <ButtonPrimary
                title="Submit closure form"
                onPress={() => router.push(`/auction/closure/${id}` as Href)}
              />
              <View
                style={{
                  marginTop: space.md,
                  paddingTop: space.md,
                  borderTopWidth: 1,
                  borderTopColor: colors.border,
                }}
              >
                {sellerPaymentStageParagraphs({
                  itemName: title,
                  bidNumber: bidNumber ?? "—",
                  winningAmountLabel,
                  position: winnerPosition,
                  winnerPhoneDisplay: winnerContactDisplay,
                }).map((para, i) => (
                  <TextBody
                    key={`pay-stage-${i}`}
                    style={{ marginTop: i === 0 ? 0 : space.sm, color: colors.textSecondary }}
                  >
                    {para}
                  </TextBody>
                ))}
              </View>
            </View>
          ) : null}

          {isWinner && status === "awaiting_winner_consent" ? (
            <View style={{ marginTop: space.lg, gap: space.md }}>
              <TextTitle style={{ fontSize: 20 }}>You won this auction</TextTitle>
              {winnerConsentRequestedParagraphs({
                itemName: title,
                bidNumber: bidNumber ?? "—",
                winningAmountLabel,
                sellerPhoneDisplay,
                communicationCode: communicationCode ?? "—",
                position: winnerPosition,
              }).map((para, i) => (
                <TextBody
                  key={`win-consent-${i}`}
                  style={{ marginTop: i === 0 ? space.sm : space.xs, color: colors.textSecondary }}
                >
                  {para}
                </TextBody>
              ))}
              <Checkbox
                checked={agreeWinnerTerms}
                onToggle={() => setAgreeWinnerTerms((v) => !v)}
                label="I agree to the platform terms."
              />
              <Checkbox
                checked={agreeShareContact}
                onToggle={() => setAgreeShareContact((v) => !v)}
                label="I consent to share my contact information with the seller."
              />
              <ButtonPrimary
                title="Give consent"
                onPress={() => void giveWinnerConsent()}
                disabled={!agreeWinnerTerms || !agreeShareContact}
              />
            </View>
          ) : null}

          {liveUi && !isSeller && session ? (
            <View style={{ marginTop: space.xl }}>
              <NumericStepper
                value={bidAmount}
                min={minNext}
                step={step}
                onChange={setBidAmount}
                label="YOUR BID (MVR)"
              />
              <ButtonPrimary
                title="PLACE BID"
                icon="hammer"
                variant="success"
                onPress={placeBid}
                style={{ marginTop: space.lg, borderRadius: radii.sm }}
              />
            </View>
          ) : null}

          {liveUi && !session ? (
            <View style={{ marginTop: space.xl }}>
              <ButtonPrimary
                title="LOG IN TO BID"
                onPress={() => router.push("/(auth)/login")}
              />
            </View>
          ) : null}

          {isSeller ? (
            <TextCaption style={{ marginTop: space.lg, fontWeight: "600" }}>
              This is your listing.
            </TextCaption>
          ) : null}
        </View>
      </Animated.View>

      <View style={{ paddingHorizontal: space.lg, marginTop: space.xl }}>
        <TextTitle style={{ fontSize: 20 }}>Product description</TextTitle>
        <TextBody style={{ marginTop: space.md }}>{desc || "—"}</TextBody>

        <View
          style={{
            flexDirection: "row",
            flexWrap: "wrap",
            gap: space.sm,
            marginTop: space.lg,
          }}
        >
          {loc ? (
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                gap: space.xs,
                backgroundColor: colors.tertiaryMuted,
                paddingHorizontal: space.md,
                paddingVertical: space.sm,
                borderRadius: radii.pill,
              }}
            >
              <Ionicons name="location-outline" size={16} color={colors.tertiary} />
              <TextCaption style={{ fontWeight: "600", color: colors.primary }}>
                {loc}
              </TextCaption>
            </View>
          ) : null}
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              gap: space.xs,
              backgroundColor: colors.tertiaryMuted,
              paddingHorizontal: space.md,
              paddingVertical: space.sm,
              borderRadius: radii.pill,
            }}
          >
            <Ionicons name="cube-outline" size={16} color={colors.tertiary} />
            <TextCaption style={{ fontWeight: "600", color: colors.primary }}>
              Local pickup available
            </TextCaption>
          </View>
        </View>
      </View>

      <View style={{ paddingHorizontal: space.lg, marginTop: space.xl }}>
        <BidHistoryCollapsible bids={bids ?? []} />
      </View>

      <View style={{ paddingHorizontal: space.lg, marginTop: space.xl }}>
        <SellerCard
          displayName={sellerName}
          ratingLabel="4.9 (128)"
          onMessagePress={
            isSeller
              ? undefined
              : () => Alert.alert("Messages", "Messaging will be available in a future update.")
          }
          onProfilePress={
            isSeller
              ? undefined
              : () =>
                  Alert.alert(
                    "Seller profile",
                    "Public seller profiles will be available in a future update.",
                  )
          }
        />
      </View>

      {winnerId === session?.user.id &&
      ["won", "paid", "payment_stage"].includes(status) &&
      payment ? (
        <View style={{ paddingHorizontal: space.lg, marginTop: space.xl }}>
          <TextTitle>Payment instructions</TextTitle>
          <TextBody style={{ marginTop: space.sm }}>{payment}</TextBody>
        </View>
      ) : null}

      {winnerId === session?.user.id && status === "completed" ? (
        <View style={{ paddingHorizontal: space.lg, marginTop: space.lg }}>
          <ButtonPrimary
            title="Leave feedback for seller"
            onPress={() => router.push(`/auction/feedback/${id}` as Href)}
          />
        </View>
      ) : null}

      <View
        style={{
          marginHorizontal: space.lg,
          marginTop: space.xl,
          marginBottom: space.lg,
          padding: space.lg,
          backgroundColor: colors.accentMuted,
          borderRadius: radii.lg,
          borderWidth: 1,
          borderColor: colors.border,
        }}
      >
        <View style={{ flexDirection: "row", alignItems: "center", gap: space.sm }}>
          <Ionicons name="shield-checkmark-outline" size={22} color={colors.primary} />
          <TextBody style={{ fontWeight: "600", flex: 1 }}>Buyer protection</TextBody>
        </View>
        <TextBody style={{ marginTop: space.md, color: colors.textSecondary }}>
          Pay using the seller’s instructions after you win. The seller confirms receipt; our team
          can help if something goes wrong.
        </TextBody>
        <Pressable
          onPress={() =>
            Alert.alert(
              "Buyer protection",
              "Complete payment only through instructions from the verified seller listing.",
            )
          }
          style={{ marginTop: space.md, alignSelf: "flex-start" }}
        >
          <TextCaption style={{ fontWeight: "600", textDecorationLine: "underline" }}>
            LEARN MORE →
          </TextCaption>
        </Pressable>
      </View>
    </Screen>
  );
}
