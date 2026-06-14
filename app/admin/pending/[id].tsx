import { useState } from "react";
import { Alert, Image, Modal, Pressable, TextInput, View } from "react-native";
import { useLocalSearchParams } from "expo-router";
import { supabase } from "@/src/lib/supabase";
import { storageSignedUrl } from "@/src/lib/storage-signed-url";
import { useAuctionDetail } from "@/src/data/auctions";
import { useQueryClient } from "@tanstack/react-query";
import { Screen } from "@/src/components/ui/Screen";
import { TextTitle } from "@/src/components/ui/TextTitle";
import { TextBody } from "@/src/components/ui/TextBody";
import { TextCaption } from "@/src/components/ui/TextCaption";
import { ButtonPrimary } from "@/src/components/ui/ButtonPrimary";
import { ButtonSecondary } from "@/src/components/ui/ButtonSecondary";
import { ValueCurrency } from "@/src/components/ui/ValueCurrency";
import { Badge } from "@/src/components/ui/Badge";
import { colors, radii, space } from "@/src/theme/tokens";

export default function AdminPendingDetailScreen() {
  const params = useLocalSearchParams<{ id: string | string[] }>();
  const id =
    typeof params.id === "string"
      ? params.id
      : Array.isArray(params.id)
        ? params.id[0] ?? ""
        : "";
  const qc = useQueryClient();
  const { data: row, isPending, refetch } = useAuctionDetail(id);
  const [rejectOpen, setRejectOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  const [proofUrl, setProofUrl] = useState<string | null>(null);
  const [proofOpen, setProofOpen] = useState(false);

  async function loadProof(path: string) {
    try {
      const url = await storageSignedUrl("payment-proofs", path, 7200);
      setProofUrl(url);
      setProofOpen(true);
    } catch (e: unknown) {
      Alert.alert("Proof", e instanceof Error ? e.message : "Could not load image");
    }
  }

  async function approve() {
    const { data: rpc, error } = await supabase.rpc("admin_approve_auction", {
      p_auction_id: id,
    });
    if (error) Alert.alert("Error", error.message);
    else if (rpc && typeof rpc === "object" && "ok" in rpc && rpc.ok === false) {
      Alert.alert("Error", String((rpc as { error?: string }).error));
    } else {
      await refetch();
      qc.invalidateQueries({ queryKey: ["admin-pending"] });
      qc.invalidateQueries({ queryKey: ["admin-queue-counts"] });
      qc.invalidateQueries({ queryKey: ["auctions"] });
      Alert.alert("Approved", "Listing is now live with bid codes.");
    }
  }

  async function confirmReject() {
    const { data: rpc, error } = await supabase.rpc("admin_reject_auction", {
      p_auction_id: id,
      p_reason: rejectReason.trim() || "Does not meet guidelines",
    });
    if (error) Alert.alert("Error", error.message);
    else if (rpc && typeof rpc === "object" && "ok" in rpc && rpc.ok === false) {
      Alert.alert("Error", String((rpc as { error?: string }).error));
    } else {
      setRejectOpen(false);
      setRejectReason("");
      await refetch();
      qc.invalidateQueries({ queryKey: ["admin-pending"] });
      qc.invalidateQueries({ queryKey: ["admin-awaiting-payment"] });
      qc.invalidateQueries({ queryKey: ["admin-queue-counts"] });
      qc.invalidateQueries({ queryKey: ["auctions"] });
      qc.invalidateQueries({ queryKey: ["auction", id] });
      qc.invalidateQueries({ queryKey: ["auction-draft", id] });
      qc.invalidateQueries({ queryKey: ["my-auctions"] });
      Alert.alert("Rejected", "Seller has been notified.");
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
  const desc = String(r.description ?? "");
  const seller = r.seller as { display_name: string | null } | null;
  const imageUrls = (r.image_urls as string[] | undefined) ?? [];
  const starting = Number(r.starting_price ?? 0);
  const bidType = String(r.bid_type ?? "standard");
  const proofPath = (r.listing_fee_proof_path as string | null) ?? null;
  const bidNumber = (r.bid_number as string | null) ?? null;
  const commCode = (r.communication_code as string | null) ?? null;

  const featuredFeePending = Boolean(r.featured_listing_fee_pending);
  const activeFeaturedFeeRequest = status === "active" && featuredFeePending;
  const isFeaturedFeeQueue = status === "awaiting_payment" || activeFeaturedFeeRequest;
  const pendingApproval = status === "pending_approval";

  async function verifyFeaturedPayment() {
    const isAwaitingNewListing = status === "awaiting_payment";
    const rpcName = isAwaitingNewListing
      ? "admin_verify_featured_payment"
      : "admin_verify_featured_listing_fee_active";
    const { data: rpc, error } = await supabase.rpc(rpcName, {
      p_auction_id: id,
    });
    if (error) Alert.alert("Error", error.message);
    else if (rpc && typeof rpc === "object" && "ok" in rpc && rpc.ok === false) {
      Alert.alert("Error", String((rpc as { error?: string }).error));
    } else {
      await refetch();
      qc.invalidateQueries({ queryKey: ["admin-awaiting-payment"] });
      qc.invalidateQueries({ queryKey: ["admin-queue-counts"] });
      qc.invalidateQueries({ queryKey: ["auctions"] });
      qc.invalidateQueries({ queryKey: ["auction", id] });
      qc.invalidateQueries({ queryKey: ["auction-draft", id] });
      qc.invalidateQueries({ queryKey: ["my-auctions"] });
      Alert.alert(
        "Verified",
        isAwaitingNewListing
          ? "Payment verified and listing is live."
          : "Payment verified — featured tier is now active on this listing.",
      );
    }
  }

  return (
    <Screen scroll>
      {imageUrls[0] ? (
        <Image
          source={{ uri: imageUrls[0] }}
          style={{
            width: "100%",
            height: 220,
            borderRadius: radii.lg,
            backgroundColor: colors.surfaceMuted,
          }}
        />
      ) : null}

      <View style={{ flexDirection: "row", gap: space.sm, marginTop: space.lg, flexWrap: "wrap" }}>
        <Badge title={bidType === "featured" ? "FEATURED" : "STANDARD"} variant="accent" />
        <TextCaption style={{ textTransform: "uppercase", fontWeight: "600" }}>{status}</TextCaption>
      </View>

      <TextTitle style={{ marginTop: space.md }}>{title}</TextTitle>
      <TextCaption style={{ marginTop: space.sm }}>
        Seller: {seller?.display_name ?? String(r.seller_id ?? "").slice(0, 8)}
      </TextCaption>
      <View style={{ marginTop: space.md }}>
        <TextCaption>Starting price</TextCaption>
        <ValueCurrency amount={starting} size="hero" />
      </View>
      {desc ? <TextBody style={{ marginTop: space.lg }}>{desc}</TextBody> : null}

      {bidNumber ? (
        <TextCaption style={{ marginTop: space.md, fontFamily: "monospace" }}>
          Bid no: {bidNumber} · Code: {commCode ?? "—"}
        </TextCaption>
      ) : null}

      {isFeaturedFeeQueue && proofPath ? (
        <View style={{ marginTop: space.lg, gap: space.sm }}>
          <ButtonSecondary title="View payment proof" onPress={() => void loadProof(proofPath)} />
        </View>
      ) : null}

      {activeFeaturedFeeRequest && !proofPath ? (
        <TextCaption style={{ marginTop: space.lg, color: colors.textSecondary }}>
          Seller has not uploaded payment proof yet.
        </TextCaption>
      ) : null}

      {pendingApproval ? (
        <View style={{ marginTop: space.xl, gap: space.md }}>
          <ButtonPrimary title="Approve listing" onPress={approve} />
          <ButtonSecondary title="Reject…" onPress={() => setRejectOpen(true)} />
        </View>
      ) : null}

      {isFeaturedFeeQueue ? (
        <View style={{ marginTop: space.xl, gap: space.md }}>
          <ButtonPrimary
            title={
              status === "awaiting_payment" ? "Verify payment & publish" : "Verify payment (featured tier)"
            }
            onPress={verifyFeaturedPayment}
          />
          <ButtonSecondary title="Reject…" onPress={() => setRejectOpen(true)} />
        </View>
      ) : null}

      {!pendingApproval && !isFeaturedFeeQueue ? (
        <TextBody style={{ marginTop: space.lg, color: colors.textSecondary }}>
          This listing is not in an admin approval queue.
        </TextBody>
      ) : null}

      <Modal visible={rejectOpen} transparent animationType="fade">
        <Pressable
          style={{
            flex: 1,
            backgroundColor: "rgba(0,0,0,0.45)",
            justifyContent: "center",
            padding: space.lg,
          }}
          onPress={() => {
            setRejectOpen(false);
            setRejectReason("");
          }}
        >
          <Pressable
            onPress={(e) => e.stopPropagation()}
            style={{
              backgroundColor: colors.background,
              borderRadius: radii.lg,
              padding: space.lg,
              borderWidth: 1,
              borderColor: colors.border,
            }}
          >
            <TextTitle style={{ fontSize: 18 }}>Reject listing</TextTitle>
            <TextInput
              value={rejectReason}
              onChangeText={setRejectReason}
              placeholder="Reason for rejection"
              placeholderTextColor={colors.textMuted}
              multiline
              style={{
                marginTop: space.md,
                borderWidth: 1,
                borderColor: colors.border,
                borderRadius: radii.md,
                padding: space.md,
                minHeight: 88,
                color: colors.text,
              }}
            />
            <View style={{ flexDirection: "row", marginTop: space.lg, gap: space.sm }}>
              <View style={{ flex: 1 }}>
                <ButtonPrimary title="Reject" onPress={confirmReject} />
              </View>
              <View style={{ flex: 1 }}>
                <ButtonSecondary
                  title="Cancel"
                  onPress={() => {
                    setRejectOpen(false);
                    setRejectReason("");
                  }}
                />
              </View>
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      <Modal visible={proofOpen} transparent animationType="fade">
        <Pressable
          style={{
            flex: 1,
            backgroundColor: "rgba(0,0,0,0.55)",
            justifyContent: "center",
            padding: space.lg,
          }}
          onPress={() => {
            setProofOpen(false);
            setProofUrl(null);
          }}
        >
          {proofUrl ? (
            <Image
              source={{ uri: proofUrl }}
              style={{ width: "100%", height: "70%", resizeMode: "contain" }}
            />
          ) : null}
        </Pressable>
      </Modal>
    </Screen>
  );
}
