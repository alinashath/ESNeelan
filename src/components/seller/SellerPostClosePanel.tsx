import { useState } from "react";
import { Alert, View } from "react-native";
import { router, type Href } from "expo-router";
import { supabase } from "@/src/lib/supabase";
import { ButtonPrimary } from "@/src/components/ui/ButtonPrimary";
import { ButtonSecondary } from "@/src/components/ui/ButtonSecondary";
import { InfoCallout } from "@/src/components/ui/InfoCallout";
import { TextBody } from "@/src/components/ui/TextBody";
import { TextCaption } from "@/src/components/ui/TextCaption";
import { TextTitle } from "@/src/components/ui/TextTitle";
import { isAuctionLiveForUi } from "@/src/lib/auction-live";
import {
  formatMaldivesPhoneDisplay,
  sellerHighBidderPendingConsentParagraphs,
  sellerPaymentStageParagraphs,
} from "@/src/lib/bidmaster-legal-copy";
import { formatMoneyAmount } from "@/src/lib/format-money";
import { colors, radii, space } from "@/src/theme/tokens";

export type SellerPostClosePanelProps = {
  auctionId: string;
  status: string;
  endsAt: string | null;
  title: string;
  bidNumber: string | null;
  winnerContactPhone: string | null;
  winnerPosition: number;
  currentHighestBid: number;
  startingPrice: number;
  onRefresh?: () => void | Promise<void>;
  /** Called after seller_close_own_auction succeeds (e.g. invalidate queries). */
  onFinalized?: () => void | Promise<void>;
};

export function SellerPostClosePanel({
  auctionId,
  status,
  endsAt,
  title,
  bidNumber,
  winnerContactPhone,
  winnerPosition,
  currentHighestBid,
  startingPrice,
  onRefresh,
  onFinalized,
}: SellerPostClosePanelProps) {
  const [busy, setBusy] = useState(false);
  const st = String(status).trim().toLowerCase();
  const winningAmountLabel = `${formatMoneyAmount(currentHighestBid || startingPrice)} MVR`;
  const winnerContactDisplay = formatMaldivesPhoneDisplay(winnerContactPhone);
  const pastEndActive = st === "active" && endsAt != null && !isAuctionLiveForUi(status, endsAt);

  async function handleRefresh() {
    if (onRefresh) await onRefresh();
  }

  async function handleFinalize() {
    setBusy(true);
    try {
      const { data, error } = await supabase.rpc("seller_close_own_auction", {
        p_auction_id: auctionId,
      });
      if (error) throw error;
      const res = data as { ok?: boolean; error?: string; status?: string };
      if (!res?.ok) throw new Error(res?.error ?? "Could not finalize auction");
      await onFinalized?.();
      await onRefresh?.();
      const next = res.status ?? "updated";
      Alert.alert(
        "Auction finalized",
        next === "ended"
          ? "Bidding closed with no bids."
          : "A high bidder was selected. Awaiting their consent before contact details are shared.",
      );
    } catch (e: unknown) {
      Alert.alert("Finalize", e instanceof Error ? e.message : "Could not finalize auction");
    } finally {
      setBusy(false);
    }
  }

  async function handleMarkPaid() {
    setBusy(true);
    try {
      const { data: rpc, error: rpcErr } = await supabase.rpc("seller_mark_auction_paid", {
        p_auction_id: auctionId,
      });
      if (rpcErr) throw rpcErr;
      if (rpc && typeof rpc === "object" && "ok" in rpc && rpc.ok === false) {
        throw new Error(String((rpc as { error?: string }).error));
      }
      await onRefresh?.();
      Alert.alert("Updated", "Marked as paid.");
    } catch (e: unknown) {
      Alert.alert("Error", e instanceof Error ? e.message : "Could not mark paid");
    } finally {
      setBusy(false);
    }
  }

  if (pastEndActive) {
    return (
      <View style={{ marginTop: space.lg, gap: space.sm }}>
        <InfoCallout message="Bidding has ended on this listing. Finalize the auction to select a high bidder and start the winner consent flow." />
        <ButtonPrimary title="Finalize auction" onPress={() => void handleFinalize()} disabled={busy} />
        <ButtonSecondary title="Refresh status" onPress={() => void handleRefresh()} disabled={busy} />
      </View>
    );
  }

  if (st === "awaiting_winner_consent") {
    return (
      <View
        style={{
          marginTop: space.lg,
          padding: space.md,
          backgroundColor: colors.surfaceMuted,
          borderRadius: radii.md,
        }}
      >
        <TextCaption style={{ fontWeight: "500" }}>Awaiting winner consent</TextCaption>
        {sellerHighBidderPendingConsentParagraphs({
          itemName: title,
          bidNumber,
          winningAmountLabel,
        }).map((para, i) => (
          <TextBody
            key={`sv-pend-${i}`}
            style={{
              marginTop: i === 0 ? space.sm : space.xs,
              color: colors.textSecondary,
            }}
          >
            {para}
          </TextBody>
        ))}
        <ButtonSecondary
          title="Refresh status"
          onPress={() => void handleRefresh()}
          style={{ marginTop: space.md }}
        />
      </View>
    );
  }

  if (st === "payment_stage" || st === "won") {
    return (
      <View style={{ marginTop: space.lg, gap: space.sm }}>
        <TextTitle style={{ fontSize: 18 }}>Winner contact</TextTitle>
        <TextBody>
          Phone:{" "}
          <TextBody style={{ fontWeight: "600" }}>
            {winnerContactPhone ? winnerContactDisplay : "—"}
          </TextBody>
        </TextBody>
        <TextCaption>Position: {winnerPosition}</TextCaption>
        {st === "payment_stage" ? (
          <ButtonPrimary
            title="Submit closure form"
            onPress={() => router.push(`/auction/closure/${auctionId}` as Href)}
            disabled={busy}
          />
        ) : (
          <ButtonPrimary
            title="Mark paid (seller)"
            onPress={() => void handleMarkPaid()}
            disabled={busy}
          />
        )}
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
              style={{
                marginTop: i === 0 ? 0 : space.sm,
                color: colors.textSecondary,
              }}
            >
              {para}
            </TextBody>
          ))}
        </View>
      </View>
    );
  }

  return null;
}
