import { useState } from "react";
import { Alert, View } from "react-native";
import { useQueryClient } from "@tanstack/react-query";
import { ButtonPrimary } from "@/src/components/ui/ButtonPrimary";
import { ButtonSecondary } from "@/src/components/ui/ButtonSecondary";
import { TextBody } from "@/src/components/ui/TextBody";
import { TextCaption } from "@/src/components/ui/TextCaption";
import { usePendingBuyNowRequest } from "@/src/data/auctions";
import { formatMoneyAmount } from "@/src/lib/format-money";
import { supabase } from "@/src/lib/supabase";
import { colors, radii, space } from "@/src/theme/tokens";

type Props = {
  auctionId: string;
  /** When false, hide (e.g. not live). */
  enabled?: boolean;
  onRefresh?: () => void | Promise<void>;
};

export function SellerBuyNowPanel({ auctionId, enabled = true, onRefresh }: Props) {
  const qc = useQueryClient();
  const { data: pending, refetch } = usePendingBuyNowRequest(enabled ? auctionId : null);
  const [busy, setBusy] = useState(false);

  if (!enabled || !pending) return null;

  async function accept() {
    setBusy(true);
    try {
      const { data, error } = await supabase.rpc("seller_accept_buy_now", {
        p_request_id: pending!.id,
      });
      if (error) throw error;
      const res = data as { ok?: boolean; error?: string };
      if (!res?.ok) throw new Error(res?.error ?? "Could not accept Buy Now");
      await qc.invalidateQueries({ queryKey: ["buy-now-request", auctionId] });
      await qc.invalidateQueries({ queryKey: ["auction", auctionId] });
      await qc.invalidateQueries({ queryKey: ["my-auctions"] });
      await qc.invalidateQueries({ queryKey: ["auctions"] });
      await refetch();
      await onRefresh?.();
      Alert.alert(
        "Buy Now accepted",
        "Bidding has ended. Contact the buyer and submit the closure form when the sale is settled.",
      );
    } catch (e: unknown) {
      Alert.alert("Accept Buy Now", e instanceof Error ? e.message : "Action failed");
    } finally {
      setBusy(false);
    }
  }

  async function decline() {
    setBusy(true);
    try {
      const { data, error } = await supabase.rpc("seller_decline_buy_now", {
        p_request_id: pending!.id,
      });
      if (error) throw error;
      const res = data as { ok?: boolean; error?: string };
      if (!res?.ok) throw new Error(res?.error ?? "Could not decline Buy Now");
      await qc.invalidateQueries({ queryKey: ["buy-now-request", auctionId] });
      await refetch();
      await onRefresh?.();
      Alert.alert("Declined", "The Buy Now request was declined. Bidding continues.");
    } catch (e: unknown) {
      Alert.alert("Decline Buy Now", e instanceof Error ? e.message : "Action failed");
    } finally {
      setBusy(false);
    }
  }

  function confirmAccept() {
    if (!pending) return;
    Alert.alert(
      "Accept Buy Now?",
      `This ends bidding and moves the listing to payment stage at ${formatMoneyAmount(pending.amount)} MVR.`,
      [
        { text: "Back", style: "cancel" },
        { text: "Accept", style: "default", onPress: () => void accept() },
      ],
    );
  }

  function confirmDecline() {
    Alert.alert("Decline Buy Now?", "The buyer will be notified. Bidding stays open.", [
      { text: "Back", style: "cancel" },
      { text: "Decline", style: "destructive", onPress: () => void decline() },
    ]);
  }

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
      <TextCaption style={{ fontWeight: "600" }}>Buy Now request</TextCaption>
      <TextBody>
        {pending.buyer_display_name ?? "A buyer"} offered{" "}
        <TextBody style={{ fontWeight: "600" }}>
          {formatMoneyAmount(pending.amount)} MVR
        </TextBody>
        .
      </TextBody>
      <TextCaption style={{ color: colors.textMuted }}>
        Accepting ends the auction and shares contact details for payment (same as a consented win).
      </TextCaption>
      <ButtonPrimary title="Accept Buy Now" onPress={confirmAccept} disabled={busy} />
      <ButtonSecondary title="Decline" onPress={confirmDecline} disabled={busy} />
    </View>
  );
}
