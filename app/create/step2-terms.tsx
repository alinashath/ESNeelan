import { useQuery } from "@tanstack/react-query";
import { Alert, ScrollView, View } from "react-native";
import { router, useLocalSearchParams, type Href } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { supabase } from "@/src/lib/supabase";
import { useAuth } from "@/src/providers/AuthProvider";
import { Screen } from "@/src/components/ui/Screen";
import { TextTitle } from "@/src/components/ui/TextTitle";
import { TextBody } from "@/src/components/ui/TextBody";
import { TextCaption } from "@/src/components/ui/TextCaption";
import { ButtonPrimary } from "@/src/components/ui/ButtonPrimary";
import { ButtonSecondary } from "@/src/components/ui/ButtonSecondary";
import { Checkbox } from "@/src/components/ui/Checkbox";
import { StepIndicator } from "@/src/components/ui/StepIndicator";
import { colors, radii, space } from "@/src/theme/tokens";
import { useState } from "react";

const TERMS_CLAUSES = [
  "Neelan only acts as a platform connecting buyers and sellers.",
  "Neelan is not responsible for payment, delivery, returns, or transaction disputes.",
  "The seller is responsible for ensuring that the product matches the description provided.",
  "All payment and delivery instructions shared with the winning bidder must include the official bid communication code.",
  "Once a bid goes live the seller cannot cancel the bid. However, the seller may cancel the bid if payment is not received on time, or if both parties cannot agree on the terms of the transaction.",
  "Providing incorrect information in the product listing, or any loss caused to the seller due to the winning bidder's failure to disclose required information, fraud, or misrepresentation, may result in the bidder being blacklisted or banned from using this platform.",
  "The platform reserves the right to provide necessary information to relevant law enforcement authorities where required.",
  "The seller agrees to proceed under these conditions.",
] as const;

export default function CreateAuctionStep2Terms() {
  const { id: rawId } = useLocalSearchParams<{ id?: string | string[] }>();
  const id =
    typeof rawId === "string" ? rawId : Array.isArray(rawId) ? (rawId[0] ?? "") : "";
  const { session } = useAuth();
  const [agree, setAgree] = useState(false);
  const [busy, setBusy] = useState(false);

  const { data: auction, isPending } = useQuery({
    queryKey: ["auction-draft", id],
    enabled: !!id && !!session,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("auctions")
        .select("id, seller_id, status, bid_type, title")
        .eq("id", id)
        .maybeSingle();
      if (error) throw error;
      return data as {
        id: string;
        seller_id: string;
        status: string;
        bid_type: string;
        title: string;
      } | null;
    },
  });

  async function proceed() {
    if (!id || !session) return;
    if (!agree) {
      Alert.alert("Terms", "Please review the terms and tick Agree and Proceed to continue.");
      return;
    }
    if (!auction || auction.seller_id !== session.user.id || auction.status !== "draft") {
      Alert.alert("Listing", "This draft is no longer editable.");
      return;
    }
    setBusy(true);
    try {
      if (auction.bid_type === "featured") {
        router.push(`/create/step3-payment?id=${id}` as Href);
        return;
      }
      const { data: rpc, error } = await supabase.rpc("submit_auction_for_approval", {
        p_auction_id: id,
      });
      if (error) throw error;
      const res = rpc as { ok?: boolean; error?: string };
      if (!res?.ok) throw new Error(res?.error ?? "Submit failed");
      Alert.alert("Submitted", "Your listing is pending admin review.");
      router.replace("/my-auctions" as Href);
    } catch (e: unknown) {
      Alert.alert("Error", e instanceof Error ? e.message : "Could not submit");
    } finally {
      setBusy(false);
    }
  }

  if (!id) {
    return (
      <Screen scroll>
        <TextBody>Missing listing id. Go back and try again.</TextBody>
      </Screen>
    );
  }

  if (isPending || !auction) {
    return (
      <Screen scroll>
        <TextBody>Loading…</TextBody>
      </Screen>
    );
  }

  const totalSteps = auction.bid_type === "featured" ? 3 : 2;

  return (
    <Screen scroll>
      <StepIndicator
        currentStep={2}
        totalSteps={totalSteps}
        labels={auction.bid_type === "featured" ? ["Details", "Terms", "Fee"] : ["Details", "Terms"]}
      />
      <TextTitle style={{ marginBottom: space.sm }}>Platform terms</TextTitle>
      <TextBody style={{ marginBottom: space.md, color: colors.textSecondary }}>
        Step 2 of {totalSteps}: read Neelan’s seller rules, then confirm. This is separate from any terms you
        added on your listing.
      </TextBody>
      <View
        style={{
          flexDirection: "row",
          alignItems: "flex-start",
          gap: space.md,
          padding: space.md,
          marginBottom: space.lg,
          backgroundColor: colors.surfaceMuted,
          borderRadius: radii.lg,
          borderWidth: 1,
          borderColor: colors.border,
        }}
      >
        <Ionicons name="document-text-outline" size={22} color={colors.primary} style={{ marginTop: 2 }} />
        <View style={{ flex: 1 }}>
          <TextCaption style={{ color: colors.textMuted }}>You are submitting</TextCaption>
          <TextBody style={{ fontWeight: "600", marginTop: space.xs }}>
            {auction.title?.trim() ? auction.title.trim() : "Untitled draft"}
          </TextBody>
        </View>
      </View>
      <ScrollView style={{ maxHeight: 520, marginBottom: space.lg }} showsVerticalScrollIndicator showsHorizontalScrollIndicator={false}>
        {TERMS_CLAUSES.map((c, i) => (
          <TextBody key={i} style={{ marginBottom: space.md }}>
            {i + 1}. {c}
          </TextBody>
        ))}
      </ScrollView>
      <Checkbox
        checked={agree}
        onToggle={() => setAgree((v) => !v)}
        label="Agree and Proceed"
      />
      <View style={{ marginTop: space.xl, gap: space.md }}>
        <ButtonPrimary
          title={auction.bid_type === "featured" ? "Continue to fee" : "Submit for approval"}
          loading={busy}
          disabled={!agree}
          onPress={proceed}
        />
        <ButtonSecondary
          title="Edit listing"
          onPress={() => router.replace(`/create/step1-details?id=${id}` as Href)}
        />
      </View>
    </Screen>
  );
}
