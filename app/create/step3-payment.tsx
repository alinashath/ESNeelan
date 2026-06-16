import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Alert, Image, Pressable, View } from "react-native";
import * as ImagePicker from "expo-image-picker";
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
import { StepIndicator } from "@/src/components/ui/StepIndicator";
import { InfoCallout } from "@/src/components/ui/InfoCallout";
import { colors, radii, space } from "@/src/theme/tokens";
import { useState } from "react";
import { useAppSettings } from "@/src/data/app-settings";
import { formatMoneyAmount } from "@/src/lib/format-money";

export default function CreateAuctionStep3Payment() {
  const { id: rawId } = useLocalSearchParams<{ id?: string | string[] }>();
  const id =
    typeof rawId === "string" ? rawId : Array.isArray(rawId) ? (rawId[0] ?? "") : "";
  const { session } = useAuth();
  const qc = useQueryClient();
  const { data: appSettings } = useAppSettings();
  const [proofUri, setProofUri] = useState<string | null>(null);
  const [mime, setMime] = useState("image/jpeg");
  const [busy, setBusy] = useState(false);

  const { data: auction, isPending } = useQuery({
    queryKey: ["auction-draft", id],
    enabled: !!id && !!session,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("auctions")
        .select("id, seller_id, status, bid_type, listing_fee_proof_path")
        .eq("id", id)
        .maybeSingle();
      if (error) throw error;
      return data as {
        id: string;
        seller_id: string;
        status: string;
        bid_type: string;
        listing_fee_proof_path: string | null;
      } | null;
    },
  });

  async function pickProof() {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert("Permission", "Photo library access is required.");
      return;
    }
    const res = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.75,
    });
    if (res.canceled || !res.assets[0]) return;
    setProofUri(res.assets[0].uri);
    setMime(res.assets[0].mimeType ?? "image/jpeg");
  }

  async function submit() {
    if (!id || !session || !auction) return;
    if (auction.seller_id !== session.user.id || auction.status !== "draft") {
      Alert.alert("Listing", "This draft is no longer editable.");
      return;
    }
    if (auction.bid_type !== "featured") {
      router.replace(`/create/step2-terms?id=${id}` as Href);
      return;
    }
    if (!proofUri) {
      Alert.alert("Proof", "Upload a screenshot of your fee transfer.");
      return;
    }
    setBusy(true);
    try {
      const path = `${id}/fee_${Date.now()}.jpg`;
      const res = await fetch(proofUri);
      if (!res.ok) throw new Error("Could not read the image.");
      const buf = await res.arrayBuffer();
      const body = new Uint8Array(buf);
      const { error: upErr } = await supabase.storage.from("payment-proofs").upload(path, body, {
        contentType: mime,
        upsert: true,
      });
      if (upErr) throw upErr;

      const { data: proofRpc, error: proofErr } = await supabase.rpc("seller_set_featured_listing_fee_proof", {
        p_auction_id: id,
        p_storage_path: path,
      });
      if (proofErr) throw proofErr;
      const pr = proofRpc as { ok?: boolean; error?: string };
      if (pr && pr.ok === false) throw new Error(pr.error ?? "Could not save proof");

      const { data: rpc, error: rpcErr } = await supabase.rpc("submit_auction_for_approval", {
        p_auction_id: id,
      });
      if (rpcErr) throw rpcErr;
      const r = rpc as { ok?: boolean; error?: string };
      if (!r?.ok) throw new Error(r?.error ?? "Submit failed");

      qc.invalidateQueries({ queryKey: ["admin-awaiting-payment"] });
      qc.invalidateQueries({ queryKey: ["admin-queue-counts"] });
      qc.invalidateQueries({ queryKey: ["auction", id] });
      qc.invalidateQueries({ queryKey: ["auction-draft", id] });

      Alert.alert("Submitted", "Your payment proof is with admin for verification.");
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
        <TextBody>Missing listing id.</TextBody>
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

  if (auction.bid_type !== "featured") {
    return (
      <Screen scroll>
        <TextBody>This step applies to featured listings only.</TextBody>
        <ButtonPrimary title="Go back" onPress={() => router.replace(`/create/step2-terms?id=${id}` as Href)} />
      </Screen>
    );
  }

  const feeAmt = appSettings?.featured_listing_fee_amount ?? 150;
  const acct = appSettings?.featured_listing_fee_account_number ?? "—";
  const acctName = appSettings?.featured_listing_fee_account_name ?? "—";

  return (
    <Screen scroll>
      <StepIndicator currentStep={3} totalSteps={3} labels={["Details", "Terms", "Fee"]} />
      <TextTitle style={{ marginBottom: space.sm }}>Featured listing fee</TextTitle>
      <TextBody style={{ marginBottom: space.md, color: colors.textSecondary }}>
        Step 3 of 3 — pay, upload proof, then submit. An admin verifies before your listing joins the queue.
      </TextBody>
      <View style={{ marginBottom: space.md, gap: space.sm }}>
        <TextBody style={{ color: colors.text }}>1. Transfer MVR {formatMoneyAmount(feeAmt)} to the account below.</TextBody>
        <TextBody style={{ color: colors.text }}>2. Save a screenshot or receipt image on your phone.</TextBody>
        <TextBody style={{ color: colors.text }}>3. Upload it here and tap submit for approval.</TextBody>
      </View>
      <InfoCallout
        message={`Pay to ${acctName}. Account number: ${acct}. Use the reference style shown in your bank app if required, then upload proof below.`}
      />

      <Pressable
        onPress={pickProof}
        style={{
          marginTop: space.lg,
          borderWidth: 2,
          borderStyle: "dashed",
          borderColor: colors.border,
          borderRadius: radii.lg,
          padding: space.lg,
          backgroundColor: colors.surfaceMuted,
          alignItems: "center",
        }}
      >
        <Ionicons name="cloud-upload-outline" size={36} color={colors.textMuted} />
        <TextBody style={{ fontWeight: "600", marginTop: space.sm }}>Upload payment proof</TextBody>
        <TextCaption style={{ marginTop: space.xs, textAlign: "center" }}>
          Screenshot of bank transfer or receipt.
        </TextCaption>
      </Pressable>

      {proofUri ? (
        <Image
          source={{ uri: proofUri }}
          style={{
            marginTop: space.md,
            width: "100%",
            height: 200,
            borderRadius: radii.lg,
            backgroundColor: colors.surfaceMuted,
          }}
        />
      ) : null}

      <View style={{ marginTop: space.xl, gap: space.md }}>
        <ButtonPrimary title="Submit for approval" loading={busy} disabled={!proofUri} onPress={submit} />
        <ButtonSecondary
          title="Back"
          onPress={() => router.replace(`/create/step2-terms?id=${id}` as Href)}
        />
      </View>
    </Screen>
  );
}
