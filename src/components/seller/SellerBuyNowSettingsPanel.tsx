import { useEffect, useState } from "react";
import { Alert, TextInput, View } from "react-native";
import { useQueryClient } from "@tanstack/react-query";
import { ButtonPrimary } from "@/src/components/ui/ButtonPrimary";
import { ButtonSecondary } from "@/src/components/ui/ButtonSecondary";
import { TextBody } from "@/src/components/ui/TextBody";
import { TextCaption } from "@/src/components/ui/TextCaption";
import { TextLabel } from "@/src/components/ui/TextLabel";
import { formatMoneyAmount } from "@/src/lib/format-money";
import { supabase } from "@/src/lib/supabase";
import { colors, radii, space } from "@/src/theme/tokens";

type Props = {
  auctionId: string;
  startingPrice: number;
  currentHighestBid: number | null;
  buyNowPrice: number | null;
  /** Only show while listing is live. */
  enabled?: boolean;
  onRefresh?: () => void | Promise<void>;
};

export function SellerBuyNowSettingsPanel({
  auctionId,
  startingPrice,
  currentHighestBid,
  buyNowPrice,
  enabled = true,
  onRefresh,
}: Props) {
  const qc = useQueryClient();
  const [busy, setBusy] = useState(false);
  const [draft, setDraft] = useState(
    buyNowPrice != null && buyNowPrice > 0 ? String(buyNowPrice) : "",
  );

  useEffect(() => {
    setDraft(buyNowPrice != null && buyNowPrice > 0 ? String(buyNowPrice) : "");
  }, [buyNowPrice]);

  if (!enabled) return null;

  const floor = Math.max(startingPrice, currentHighestBid ?? startingPrice);

  async function save(price: number | null) {
    setBusy(true);
    try {
      const { data, error } = await supabase.rpc("seller_set_buy_now_price", {
        p_auction_id: auctionId,
        p_buy_now_price: price,
      });
      if (error) throw error;
      const res = data as {
        ok?: boolean;
        error?: string;
        min_required?: number;
        pending_cancelled?: boolean;
      };
      if (!res?.ok) {
        if (res?.error === "buy_now_too_low") {
          throw new Error(
            `Buy Now must be above ${formatMoneyAmount(Number(res.min_required ?? floor))} MVR (starting price or current bid).`,
          );
        }
        if (res?.error === "auction_ended") {
          throw new Error("This auction has already ended.");
        }
        if (res?.error === "not_active") {
          throw new Error("Buy Now can only be changed while the listing is live.");
        }
        throw new Error(res?.error ?? "Could not update Buy Now");
      }
      await qc.invalidateQueries({ queryKey: ["auction", auctionId] });
      await qc.invalidateQueries({ queryKey: ["buy-now-request", auctionId] });
      await qc.invalidateQueries({ queryKey: ["my-auctions"] });
      await onRefresh?.();
      if (price == null) {
        Alert.alert(
          "Buy Now disabled",
          res.pending_cancelled
            ? "Buy Now is off. Any pending request was cancelled."
            : "Buy Now is off for this listing.",
        );
      } else {
        Alert.alert(
          "Buy Now updated",
          res.pending_cancelled
            ? `Buy Now is now ${formatMoneyAmount(price)} MVR. Pending requests at the old price were cancelled.`
            : `Buy Now is set to ${formatMoneyAmount(price)} MVR.`,
        );
      }
    } catch (e: unknown) {
      Alert.alert("Buy Now", e instanceof Error ? e.message : "Update failed");
    } finally {
      setBusy(false);
    }
  }

  function handleSave() {
    const trim = draft.trim();
    if (!trim) {
      Alert.alert("Buy Now price", "Enter an amount, or use Remove Buy Now to clear it.");
      return;
    }
    const n = Number(trim);
    if (!Number.isFinite(n) || n <= floor) {
      Alert.alert(
        "Buy Now price",
        `Enter an amount higher than ${formatMoneyAmount(floor)} MVR (starting price or current leading bid).`,
      );
      return;
    }
    void save(n);
  }

  function handleClear() {
    Alert.alert(
      "Remove Buy Now?",
      "Buyers will no longer see a Buy Now option. Any pending request will be cancelled.",
      [
        { text: "Back", style: "cancel" },
        {
          text: "Remove",
          style: "destructive",
          onPress: () => void save(null),
        },
      ],
    );
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
      <TextCaption style={{ fontWeight: "600" }}>Buy Now settings</TextCaption>
      <TextBody style={{ color: colors.textSecondary, fontSize: 14 }}>
        Set or change the Buy Now price while this auction is live. Must be above{" "}
        {formatMoneyAmount(floor)} MVR (starting price or current leading bid). Changing or removing
        it cancels any pending Buy Now request.
      </TextBody>
      <TextLabel style={{ marginTop: space.xs }}>Buy Now price (MVR)</TextLabel>
      <View
        style={{
          borderWidth: 1,
          borderColor: colors.border,
          borderRadius: radii.sm,
          flexDirection: "row",
          alignItems: "center",
          paddingLeft: space.md,
          backgroundColor: colors.background,
        }}
      >
        <TextBody style={{ fontWeight: "600", color: colors.textMuted, marginRight: space.xs }}>
          MVR
        </TextBody>
        <TextInput
          keyboardType="decimal-pad"
          value={draft}
          onChangeText={setDraft}
          placeholder="Off"
          placeholderTextColor={colors.textMuted}
          editable={!busy}
          style={{
            flex: 1,
            paddingVertical: space.md,
            fontSize: 17,
            fontWeight: "600",
            color: colors.text,
          }}
        />
      </View>
      {buyNowPrice != null && buyNowPrice > 0 ? (
        <TextCaption style={{ color: colors.textMuted }}>
          Currently {formatMoneyAmount(buyNowPrice)} MVR
        </TextCaption>
      ) : (
        <TextCaption style={{ color: colors.textMuted }}>Buy Now is currently off</TextCaption>
      )}
      <ButtonPrimary title="Save Buy Now" onPress={handleSave} disabled={busy} />
      {buyNowPrice != null && buyNowPrice > 0 ? (
        <ButtonSecondary title="Remove Buy Now" onPress={handleClear} disabled={busy} />
      ) : null}
    </View>
  );
}
