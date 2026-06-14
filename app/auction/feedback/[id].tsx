import { useState } from "react";
import { Alert, Pressable, View } from "react-native";
import { router, useLocalSearchParams, type Href } from "expo-router";
import { useAuctionDetail } from "@/src/data/auctions";
import { useAuth } from "@/src/providers/AuthProvider";
import { Screen } from "@/src/components/ui/Screen";
import { TextTitle } from "@/src/components/ui/TextTitle";
import { TextBody } from "@/src/components/ui/TextBody";
import { TextCaption } from "@/src/components/ui/TextCaption";
import { TextLabel } from "@/src/components/ui/TextLabel";
import { ButtonPrimary } from "@/src/components/ui/ButtonPrimary";
import { ButtonSecondary } from "@/src/components/ui/ButtonSecondary";
import { StarRating } from "@/src/components/ui/StarRating";
import { submitBuyerFeedback, type FeedbackType } from "@/src/data/ratings";
import { colors, radii, space } from "@/src/theme/tokens";
import { useQueryClient } from "@tanstack/react-query";

const FEEDBACK: { id: FeedbackType; label: string }[] = [
  { id: "completed_happy", label: "Completed — happy with the transaction" },
  { id: "not_proceed_terms", label: "Did not proceed — seller terms were not acceptable" },
  { id: "not_proceed_quality", label: "Did not proceed — product did not meet expectations" },
];

export default function AuctionFeedbackScreen() {
  const params = useLocalSearchParams<{ id: string | string[] }>();
  const id =
    typeof params.id === "string"
      ? params.id
      : Array.isArray(params.id)
        ? params.id[0] ?? ""
        : "";
  const { session } = useAuth();
  const qc = useQueryClient();
  const { data: row, isPending } = useAuctionDetail(id);
  const [kind, setKind] = useState<FeedbackType | null>(null);
  const [stars, setStars] = useState(0);
  const [busy, setBusy] = useState(false);

  async function submit() {
    if (!id || !kind || stars < 1) {
      Alert.alert("Feedback", "Choose an outcome and tap 1–5 stars.");
      return;
    }
    setBusy(true);
    try {
      await submitBuyerFeedback(id, stars, kind);
      qc.invalidateQueries({ queryKey: ["auction", id] });
      Alert.alert("Thanks", "Your feedback was saved.");
      router.replace(`/auction/${id}` as Href);
    } catch (e: unknown) {
      Alert.alert("Error", e instanceof Error ? e.message : "Could not save");
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
  const title = String(r.title ?? "");
  const status = String(r.status ?? "");
  const winnerId = (r.winner_id as string | null) ?? null;
  const isWinner = !!session?.user.id && winnerId === session.user.id;

  if (!session) {
    return (
      <Screen scroll>
        <TextTitle>Feedback</TextTitle>
        <ButtonPrimary title="Log in" onPress={() => router.push("/(auth)/login")} />
      </Screen>
    );
  }

  if (!isWinner) {
    return (
      <Screen scroll>
        <TextTitle>Feedback</TextTitle>
        <TextBody style={{ marginTop: space.md }}>Only the winning bidder can leave feedback here.</TextBody>
      </Screen>
    );
  }

  return (
    <Screen scroll>
      <TextTitle>Rate your experience</TextTitle>
      <TextCaption style={{ marginTop: space.sm }}>{title}</TextCaption>

      {status !== "completed" ? (
        <TextBody style={{ marginTop: space.lg, color: colors.textSecondary }}>
          Feedback opens after the seller marks the transaction completed.
        </TextBody>
      ) : (
        <>
          <TextLabel style={{ marginTop: space.xl, marginBottom: space.sm }}>OUTCOME</TextLabel>
          {FEEDBACK.map((f) => (
            <Pressable
              key={f.id}
              onPress={() => setKind(f.id)}
              style={{
                padding: space.md,
                borderRadius: radii.md,
                borderWidth: 2,
                borderColor: kind === f.id ? colors.primary : colors.border,
                marginBottom: space.sm,
                backgroundColor: kind === f.id ? colors.accentMuted : colors.background,
              }}
            >
              <TextBody style={{ fontWeight: "600" }}>{f.label}</TextBody>
            </Pressable>
          ))}

          <TextLabel style={{ marginTop: space.lg, marginBottom: space.sm }}>RATE THE SELLER</TextLabel>
          <StarRating value={stars} onChange={setStars} />

          <View style={{ marginTop: space.xl, gap: space.md }}>
            <ButtonPrimary title="Submit feedback" loading={busy} onPress={submit} />
            <ButtonSecondary title="Cancel" onPress={() => router.back()} />
          </View>
        </>
      )}
    </Screen>
  );
}
