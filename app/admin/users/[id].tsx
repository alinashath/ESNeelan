import { useState } from "react";
import { Alert, Modal, Pressable, TextInput, View } from "react-native";
import { router, useLocalSearchParams, type Href } from "expo-router";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/src/lib/supabase";
import { useAdminProfileDetail } from "@/src/data/user-auctions";
import { useAuth } from "@/src/providers/AuthProvider";
import { Screen } from "@/src/components/ui/Screen";
import { TextBody } from "@/src/components/ui/TextBody";
import { TextCaption } from "@/src/components/ui/TextCaption";
import { TextTitle } from "@/src/components/ui/TextTitle";
import { ButtonPrimary } from "@/src/components/ui/ButtonPrimary";
import { ButtonSecondary } from "@/src/components/ui/ButtonSecondary";
import { colors, radii, space } from "@/src/theme/tokens";

export default function AdminUserDetailScreen() {
  const params = useLocalSearchParams<{ id: string | string[] }>();
  const id =
    typeof params.id === "string"
      ? params.id
      : Array.isArray(params.id)
        ? (params.id[0] ?? "")
        : "";
  const { profile } = useAuth();
  const isAdmin = profile?.role === "admin";
  const qc = useQueryClient();
  const { data: u, isPending, refetch } = useAdminProfileDetail(id, isAdmin);
  const [rejectOpen, setRejectOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState("");

  async function suspend(suspendUser: boolean) {
    const { data: rpc, error } = await supabase.rpc("admin_set_user_suspended", {
      p_user_id: id,
      p_suspend: suspendUser,
    });
    if (error) Alert.alert("Error", error.message);
    else if (rpc && typeof rpc === "object" && "ok" in rpc && rpc.ok === false) {
      Alert.alert("Error", String((rpc as { error?: string }).error));
    } else {
      await refetch();
      qc.invalidateQueries({ queryKey: ["admin-users"] });
    }
  }

  function promptApproveSellerVerification(status: string) {
    if (status === "pending") {
      void approveSellerVerification();
      return;
    }
    if (status === "none" || status === "rejected") {
      Alert.alert(
        "Approve seller verification",
        status === "rejected"
          ? "This user is not awaiting review. Approve anyway to allow them to list without submitting new documents?"
          : "This user has not completed an in-app verification request. Approve anyway to allow them to list?",
        [
          { text: "Cancel", style: "cancel" },
          { text: "Approve", onPress: () => void approveSellerVerification() },
        ],
      );
    }
  }

  async function approveSellerVerification() {
    const { data: rpc, error } = await supabase.rpc("admin_approve_seller", {
      p_user_id: id,
    });
    if (error) Alert.alert("Error", error.message);
    else if (rpc && typeof rpc === "object" && "ok" in rpc && rpc.ok === false) {
      const code = (rpc as { error?: string }).error;
      const human =
        code === "invalid_state"
          ? "Could not approve (user may already be verified, or is not eligible)."
          : code === "not_pending"
            ? "This database only allows approving pending requests. Apply migration 20250615220000_admin_approve_seller_any_eligible.sql to approve from none or rejected."
          : code === "forbidden"
            ? "You do not have permission to approve."
            : String(code ?? "Request failed");
      Alert.alert("Error", human);
    } else {
      await refetch();
      qc.invalidateQueries({ queryKey: ["admin-users"] });
      qc.invalidateQueries({ queryKey: ["admin", "pending-sellers"] });
      qc.invalidateQueries({ queryKey: ["admin-profile", id] });
      qc.invalidateQueries({ queryKey: ["admin-seller-pending", id] });
      Alert.alert("Approved", "This user can submit listings for sale.");
    }
  }

  async function rejectSellerVerification() {
    const { data: rpc, error } = await supabase.rpc("admin_reject_seller", {
      p_user_id: id,
      p_reason: rejectReason.trim() || "Does not meet seller guidelines",
    });
    if (error) Alert.alert("Error", error.message);
    else if (rpc && typeof rpc === "object" && "ok" in rpc && rpc.ok === false) {
      Alert.alert("Error", String((rpc as { error?: string }).error));
    } else {
      setRejectOpen(false);
      setRejectReason("");
      await refetch();
      qc.invalidateQueries({ queryKey: ["admin-users"] });
      qc.invalidateQueries({ queryKey: ["admin", "pending-sellers"] });
      qc.invalidateQueries({ queryKey: ["admin-profile", id] });
      qc.invalidateQueries({ queryKey: ["admin-seller-pending", id] });
      Alert.alert("Rejected", "The user has been notified.");
    }
  }

  function revokeSellerVerification() {
    Alert.alert(
      "Revoke seller verification",
      "They will need to submit documents again before listing items.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Revoke",
          style: "destructive",
          onPress: () => void doRevokeSellerVerification(),
        },
      ],
    );
  }

  async function doRevokeSellerVerification() {
    const { data: rpc, error } = await supabase.rpc("admin_revoke_seller_verification", {
      p_user_id: id,
    });
    if (error) Alert.alert("Error", error.message);
    else if (rpc && typeof rpc === "object" && "ok" in rpc && rpc.ok === false) {
      const code = (rpc as { error?: string }).error;
      const human =
        code === "not_approved_or_is_admin"
          ? "This user is not in the approved state, or is an admin account."
          : String(code ?? "Request failed");
      Alert.alert("Error", human);
    } else {
      await refetch();
      qc.invalidateQueries({ queryKey: ["admin-users"] });
      qc.invalidateQueries({ queryKey: ["admin", "pending-sellers"] });
      qc.invalidateQueries({ queryKey: ["admin-profile", id] });
      qc.invalidateQueries({ queryKey: ["admin-seller-pending", id] });
      Alert.alert("Updated", "Seller verification has been revoked.");
    }
  }

  if (!isAdmin) {
    return (
      <Screen scroll>
        <TextTitle>User</TextTitle>
        <TextBody style={{ marginTop: space.lg }}>Admin only.</TextBody>
      </Screen>
    );
  }

  if (!id) {
    return (
      <Screen scroll>
        <TextBody>Invalid link.</TextBody>
      </Screen>
    );
  }

  if (isPending || !u) {
    return (
      <Screen scroll>
        <TextBody>Loading…</TextBody>
      </Screen>
    );
  }

  const row = u as Record<string, unknown>;
  const role = String(row.role ?? "buyer");
  const sv = String(row.seller_verification_status ?? "none");
  const isTargetAdmin = role === "admin";

  return (
    <Screen scroll>
      <TextTitle>{String(row.display_name ?? "—")}</TextTitle>
      <TextCaption style={{ marginTop: space.sm }}>{String(row.phone ?? "")}</TextCaption>
      <TextBody style={{ marginTop: space.md }}>Role: {role}</TextBody>
      <TextBody style={{ marginTop: space.xs }}>
        {row.suspended_at ? `Suspended: ${String(row.suspended_at)}` : "Active"}
      </TextBody>

      {!isTargetAdmin ? (
        <View
          style={{
            marginTop: space.lg,
            padding: space.lg,
            borderRadius: radii.lg,
            borderWidth: 1,
            borderColor: colors.border,
            backgroundColor: colors.surfaceMuted,
            gap: space.sm,
          }}
        >
          <TextTitle style={{ fontSize: 18 }}>Seller verification</TextTitle>
          <TextBody style={{ color: colors.textSecondary }}>Status: {sv}</TextBody>
          {row.seller_verification_note && sv === "rejected" ? (
            <TextCaption style={{ color: colors.textSecondary }}>
              Last note: {String(row.seller_verification_note)}
            </TextCaption>
          ) : null}

          {sv === "pending" ? (
            <>
              <ButtonSecondary
                title="Review uploaded documents"
                onPress={() => router.push(`/admin/sellers/${id}` as Href)}
              />
              <ButtonPrimary
                title="Approve verification"
                onPress={() => promptApproveSellerVerification(sv)}
              />
              <ButtonSecondary title="Reject verification…" onPress={() => setRejectOpen(true)} />
            </>
          ) : null}

          {sv === "approved" ? (
            <ButtonPrimary title="Revoke verification" onPress={revokeSellerVerification} />
          ) : null}

          {(sv === "none" || sv === "rejected") && (
            <>
              <TextCaption style={{ color: colors.textSecondary }}>
                Prefer having them upload ID or business registration from Profile → Seller verification.
                You can still approve manually if you have verified them outside the app.
              </TextCaption>
              <ButtonPrimary
                title="Approve verification (manual)"
                onPress={() => promptApproveSellerVerification(sv)}
              />
            </>
          )}
        </View>
      ) : (
        <TextCaption style={{ marginTop: space.lg, color: colors.textSecondary }}>
          Admin accounts do not use seller verification in this flow.
        </TextCaption>
      )}

      <TextCaption style={{ marginTop: space.md }}>
        Joined:{" "}
        {row.created_at ? new Date(String(row.created_at)).toLocaleString() : "—"}
      </TextCaption>
      {row.contact_email ? (
        <TextBody style={{ marginTop: space.md }}>Contact: {String(row.contact_email)}</TextBody>
      ) : null}
      {row.location_text ? (
        <TextBody style={{ marginTop: space.xs }}>Location: {String(row.location_text)}</TextBody>
      ) : null}

      <View style={{ marginTop: space.xl }}>
        <ButtonSecondary
          title={row.suspended_at ? "Unsuspend user" : "Suspend user"}
          onPress={() => suspend(!row.suspended_at)}
        />
      </View>

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
            <TextTitle style={{ fontSize: 18 }}>Reject seller verification</TextTitle>
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
                <ButtonPrimary title="Reject" onPress={() => void rejectSellerVerification()} />
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
    </Screen>
  );
}
