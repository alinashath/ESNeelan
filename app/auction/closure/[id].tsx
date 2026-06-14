import { useState } from "react";
import { Alert, Pressable, TextInput, View } from "react-native";
import { router, useLocalSearchParams, type Href } from "expo-router";
import { supabase } from "@/src/lib/supabase";
import { useAuth } from "@/src/providers/AuthProvider";
import { useAuctionDetail } from "@/src/data/auctions";
import { useQueryClient } from "@tanstack/react-query";
import { Screen } from "@/src/components/ui/Screen";
import { TextTitle } from "@/src/components/ui/TextTitle";
import { TextBody } from "@/src/components/ui/TextBody";
import { TextCaption } from "@/src/components/ui/TextCaption";
import { TextLabel } from "@/src/components/ui/TextLabel";
import { ButtonPrimary } from "@/src/components/ui/ButtonPrimary";
import { ButtonSecondary } from "@/src/components/ui/ButtonSecondary";
import { Checkbox } from "@/src/components/ui/Checkbox";
import { colors, radii, space } from "@/src/theme/tokens";

type Outcome = "completed" | "cancelled_no_payment" | "cancelled_terms_disagreement";

const OUTCOMES: { id: Outcome; label: string }[] = [
  { id: "completed", label: "Transaction successfully closed" },
  { id: "cancelled_no_payment", label: "Cancelled — buyer did not pay on time" },
  { id: "cancelled_terms_disagreement", label: "Cancelled — parties could not agree on terms" },
];

export default function AuctionClosureScreen() {
  const params = useLocalSearchParams<{ id: string | string[] }>();
  const id =
    typeof params.id === "string"
      ? params.id
      : Array.isArray(params.id)
        ? params.id[0] ?? ""
        : "";
  const { session } = useAuth();
  const qc = useQueryClient();
  const { data: row, isPending, refetch } = useAuctionDetail(id);
  const [outcome, setOutcome] = useState<Outcome | null>(null);
  const [notes, setNotes] = useState("");
  const [selectNext, setSelectNext] = useState(false);
  const [busy, setBusy] = useState(false);

  async function submit() {
    if (!id || !session || !outcome) {
      Alert.alert("Form", "Choose an outcome.");
      return;
    }
    const wantNext = outcome !== "completed" && selectNext;
    setBusy(true);
    try {
      const { data: rpc, error } = await supabase.rpc("seller_submit_closure", {
        p_auction_id: id,
        p_outcome: outcome,
        p_notes: notes.trim() || null,
        p_select_next: wantNext,
      });
      if (error) throw error;
      const res = rpc as { ok?: boolean; error?: string; message?: string };
      if (!res?.ok) throw new Error(res?.error ?? "Could not submit");
      await refetch();
      qc.invalidateQueries({ queryKey: ["my-auctions"] });
      qc.invalidateQueries({ queryKey: ["auctions"] });
      Alert.alert("Saved", res.message === "no_more_bidders" ? "No further bidders — auction cancelled." : "Closure recorded.");
      router.replace(`/auction/${id}` as Href);
    } catch (e: unknown) {
      Alert.alert("Error", e instanceof Error ? e.message : "Submit failed");
    } finally {
      setBusy(false);
    }
  }

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
  const status = String(r.status ?? "");
  const title = String(r.title ?? "");
  const sellerId = String(r.seller_id ?? "");
  const isMine = session?.user.id === sellerId;

  if (!isMine || status !== "payment_stage") {
    return (
      <Screen scroll>
        <TextTitle>Closure form</TextTitle>
        <TextBody style={{ marginTop: space.md }}>
          This form is only available to the seller while the auction is in payment stage.
        </TextBody>
      </Screen>
    );
  }

  const cancelled = outcome && outcome !== "completed";

  return (
    <Screen scroll>
      <TextTitle>Bid closure</TextTitle>
      <TextCaption style={{ marginTop: space.sm }}>{title}</TextCaption>

      <TextLabel style={{ marginTop: space.xl, marginBottom: space.sm }}>OUTCOME</TextLabel>
      {OUTCOMES.map((o) => (
        <Pressable
          key={o.id}
          onPress={() => setOutcome(o.id)}
          style={{
            padding: space.md,
            borderRadius: radii.md,
            borderWidth: 2,
            borderColor: outcome === o.id ? colors.primary : colors.border,
            marginBottom: space.sm,
            backgroundColor: outcome === o.id ? colors.accentMuted : colors.background,
          }}
        >
          <TextBody style={{ fontWeight: "600" }}>{o.label}</TextBody>
        </Pressable>
      ))}

      <TextLabel style={{ marginTop: space.lg, marginBottom: space.sm }}>NOTES (OPTIONAL)</TextLabel>
      <TextInput
        value={notes}
        onChangeText={setNotes}
        placeholder="Anything admin should know"
        placeholderTextColor={colors.textMuted}
        multiline
        style={{
          borderWidth: 1,
          borderColor: colors.border,
          borderRadius: radii.md,
          padding: space.md,
          minHeight: 100,
          color: colors.text,
        }}
      />

      {cancelled ? (
        <View style={{ marginTop: space.lg }}>
          <Checkbox
            checked={selectNext}
            onToggle={() => setSelectNext((s) => !s)}
            label="Select next eligible bidder (cascade)"
          />
        </View>
      ) : null}

      <View style={{ marginTop: space.xl, gap: space.md }}>
        <ButtonPrimary title="Submit closure" loading={busy} disabled={!outcome} onPress={submit} />
        <ButtonSecondary title="Cancel" onPress={() => router.back()} />
      </View>
    </Screen>
  );
}
