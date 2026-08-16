import { useEffect, useMemo, useState } from "react";
import { Alert, Platform, View } from "react-native";
import { router, type Href } from "expo-router";
import { supabase } from "@/src/lib/supabase";
import { ButtonPrimary } from "@/src/components/ui/ButtonPrimary";
import { ButtonSecondary } from "@/src/components/ui/ButtonSecondary";
import { DateTimeField } from "@/src/components/ui/DateTimeField";
import { InfoCallout } from "@/src/components/ui/InfoCallout";
import { TextBody } from "@/src/components/ui/TextBody";
import { TextCaption } from "@/src/components/ui/TextCaption";
import { TextTitle } from "@/src/components/ui/TextTitle";
import { isAuctionLiveForUi } from "@/src/lib/auction-live";
import {
  formatMaldivesPhoneDisplay,
  sellerAwaitingConsentDeadlineParagraphs,
  sellerHighBidderPendingConsentParagraphs,
  sellerPaymentStageParagraphs,
} from "@/src/lib/bidmaster-legal-copy";
import { formatMoneyWithSign } from "@/src/lib/format-money";
import {
  formatWinnerConsentCountdown,
  isWinnerConsentDeadlinePassed,
  winnerConsentTimeRemainingMs,
} from "@/src/lib/winner-consent-deadline";
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
  winnerConsentRequestedAt?: string | null;
  onRefresh?: () => void | Promise<void>;
  /** Called after seller_close_own_auction succeeds (e.g. invalidate queries). */
  onFinalized?: () => void | Promise<void>;
};

function defaultReenableEndsAt(): Date {
  const d = new Date();
  d.setDate(d.getDate() + 3);
  d.setMinutes(0, 0, 0);
  return d;
}

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
  winnerConsentRequestedAt,
  onRefresh,
  onFinalized,
}: SellerPostClosePanelProps) {
  const [busy, setBusy] = useState(false);
  const [tick, setTick] = useState(0);
  const [reenableEndsAt, setReenableEndsAt] = useState(defaultReenableEndsAt);
  const st = String(status).trim().toLowerCase();
  const winningAmountLabel = formatMoneyWithSign(currentHighestBid || startingPrice);
  const winnerContactDisplay = formatMaldivesPhoneDisplay(winnerContactPhone);
  const pastEndActive = st === "active" && endsAt != null && !isAuctionLiveForUi(status, endsAt);

  const consentDeadlinePassed = useMemo(
    () => isWinnerConsentDeadlinePassed(winnerConsentRequestedAt),
    [winnerConsentRequestedAt, tick],
  );
  const consentCountdownLabel = useMemo(() => {
    void tick;
    return formatWinnerConsentCountdown(winnerConsentTimeRemainingMs(winnerConsentRequestedAt));
  }, [winnerConsentRequestedAt, tick]);

  useEffect(() => {
    if (st !== "awaiting_winner_consent" || consentDeadlinePassed) return;
    const t = setInterval(() => setTick((n) => n + 1), 30_000);
    return () => clearInterval(t);
  }, [consentDeadlinePassed, st]);

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

  async function skipWinner(selectNext: boolean) {
    setBusy(true);
    try {
      const { data, error } = await supabase.rpc("seller_skip_winner_no_consent", {
        p_auction_id: auctionId,
        p_select_next: selectNext,
        p_notes: null,
      });
      if (error) throw error;
      const res = data as { ok?: boolean; error?: string; message?: string };
      if (!res?.ok) {
        if (res?.error === "consent_deadline_not_reached") {
          throw new Error("The 48-hour consent window has not ended yet.");
        }
        throw new Error(res?.error ?? "Could not update winner");
      }
      await onFinalized?.();
      await onRefresh?.();
      if (res.message === "no_more_bidders") {
        Alert.alert("No more bidders", "There are no further eligible bidders. The auction was cancelled.");
      } else if (selectNext) {
        Alert.alert("Next bidder selected", "The next eligible bidder has been notified to give consent.");
      } else {
        Alert.alert("Auction cancelled", "The winner was removed and the listing was cancelled.");
      }
    } catch (e: unknown) {
      Alert.alert("Winner update", e instanceof Error ? e.message : "Action failed");
    } finally {
      setBusy(false);
    }
  }

  function confirmSkipWinner(selectNext: boolean) {
    const titleAlert = selectNext ? "Choose next bidder?" : "Cancel winner and end auction?";
    const message = selectNext
      ? "The current high bidder will be skipped and the next eligible bidder (by amount) will be asked for consent."
      : "The current high bidder will be skipped and this listing will be marked cancelled.";

    if (Platform.OS === "web") {
      const confirmed = globalThis.confirm?.(`${titleAlert}\n\n${message}`) ?? false;
      if (confirmed) void skipWinner(selectNext);
      return;
    }

    Alert.alert(titleAlert, message, [
      { text: "Back", style: "cancel" },
      {
        text: selectNext ? "Choose next bidder" : "Cancel auction",
        style: selectNext ? "default" : "destructive",
        onPress: () => void skipWinner(selectNext),
      },
    ]);
  }

  async function handleReenable() {
    if (reenableEndsAt.getTime() <= Date.now()) {
      Alert.alert("New end time", "Choose an end date and time in the future.");
      return;
    }
    setBusy(true);
    try {
      const { data, error } = await supabase.rpc("seller_reenable_auction", {
        p_auction_id: auctionId,
        p_ends_at: reenableEndsAt.toISOString(),
      });
      if (error) throw error;
      const res = data as { ok?: boolean; error?: string };
      if (!res?.ok) {
        const err = res?.error ?? "Could not re-enable auction";
        if (err === "has_bids") throw new Error("This listing has bids and cannot be re-enabled.");
        if (err === "not_ended") throw new Error("Only ended (no bids) listings can be re-enabled.");
        if (err === "ends_at_must_be_future") throw new Error("Choose an end time in the future.");
        if (err === "ends_at_before_starts_at") {
          throw new Error("End time must be after the original start time.");
        }
        throw new Error(err);
      }
      await onFinalized?.();
      await onRefresh?.();
      Alert.alert("Auction re-enabled", "Your listing is live again until the new end time.");
    } catch (e: unknown) {
      Alert.alert("Re-enable", e instanceof Error ? e.message : "Could not re-enable auction");
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

  if (st === "ended") {
    return (
      <View
        style={{
          marginTop: space.lg,
          padding: space.md,
          backgroundColor: colors.surfaceMuted,
          borderRadius: radii.md,
          gap: space.sm,
        }}
      >
        <TextCaption style={{ fontWeight: "500" }}>Ended with no bids</TextCaption>
        <TextBody style={{ color: colors.textSecondary }}>
          You can re-enable this listing with a new end date. Bidding will open again immediately.
        </TextBody>
        <DateTimeField
          label="New auction end"
          value={reenableEndsAt}
          mode="datetime"
          onChange={setReenableEndsAt}
          minimumDate={new Date()}
        />
        <ButtonPrimary title="Re-enable auction" onPress={() => void handleReenable()} disabled={busy} />
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
          gap: space.sm,
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
        <View
          style={{
            marginTop: space.sm,
            paddingTop: space.sm,
            borderTopWidth: 1,
            borderTopColor: colors.border,
          }}
        >
          {sellerAwaitingConsentDeadlineParagraphs({
            deadlinePassed: consentDeadlinePassed,
            countdownLabel: consentCountdownLabel,
          }).map((para, i) => (
            <TextBody
              key={`sv-deadline-${i}`}
              style={{
                marginTop: i === 0 ? 0 : space.xs,
                color: colors.textSecondary,
              }}
            >
              {para}
            </TextBody>
          ))}
        </View>
        {consentDeadlinePassed ? (
          <View style={{ gap: space.sm, marginTop: space.sm }}>
            <ButtonPrimary
              title="Choose next bidder"
              onPress={() => confirmSkipWinner(true)}
              disabled={busy}
            />
            <ButtonSecondary
              title="Cancel winner & end auction"
              onPress={() => confirmSkipWinner(false)}
              disabled={busy}
            />
          </View>
        ) : (
          <TextCaption style={{ marginTop: space.sm, color: colors.textMuted }}>
            Consent deadline: {consentCountdownLabel} remaining
          </TextCaption>
        )}
        <ButtonSecondary
          title="Refresh status"
          onPress={() => void handleRefresh()}
          disabled={busy}
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
