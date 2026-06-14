import { useState } from "react";
import { Alert, Image, Modal, Pressable, TextInput, View } from "react-native";
import { useLocalSearchParams } from "expo-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/src/lib/supabase";
import { storageSignedUrl } from "@/src/lib/storage-signed-url";
import { useAuth } from "@/src/providers/AuthProvider";
import { Screen } from "@/src/components/ui/Screen";
import { TextTitle } from "@/src/components/ui/TextTitle";
import { TextBody } from "@/src/components/ui/TextBody";
import { TextCaption } from "@/src/components/ui/TextCaption";
import { TextLabel } from "@/src/components/ui/TextLabel";
import { ButtonPrimary } from "@/src/components/ui/ButtonPrimary";
import { ButtonSecondary } from "@/src/components/ui/ButtonSecondary";
import { colors, radii, space } from "@/src/theme/tokens";

const DOC_BUCKET = "seller-verification-docs";

export default function AdminSellerDetailScreen() {
  const params = useLocalSearchParams<{ id: string | string[] }>();
  const id =
    typeof params.id === "string"
      ? params.id
      : Array.isArray(params.id)
        ? params.id[0] ?? ""
        : "";
  const { profile } = useAuth();
  const isAdmin = profile?.role === "admin";
  const qc = useQueryClient();
  const [rejectReason, setRejectReason] = useState("");
  const [rejectMode, setRejectMode] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);

  const { data: u, isPending, refetch } = useQuery({
    queryKey: ["admin-seller-pending", id],
    enabled: isAdmin && !!id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select(
          "id, display_name, phone, account_type, seller_applied_at, seller_verification_status, seller_verification_id_document_path, seller_verification_business_reg_path",
        )
        .eq("id", id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  async function openDoc(path: string | null | undefined) {
    if (!path?.trim()) return;
    try {
      const url = await storageSignedUrl(DOC_BUCKET, path, 7200);
      setPreviewUrl(url);
      setPreviewOpen(true);
    } catch (e: unknown) {
      Alert.alert("Document", e instanceof Error ? e.message : "Could not load");
    }
  }

  async function approve() {
    const { data: rpc, error } = await supabase.rpc("admin_approve_seller", {
      p_user_id: id,
    });
    if (error) Alert.alert("Error", error.message);
    else if (rpc && typeof rpc === "object" && "ok" in rpc && rpc.ok === false) {
      Alert.alert("Error", String((rpc as { error?: string }).error));
    } else {
      qc.invalidateQueries({ queryKey: ["admin", "pending-sellers"] });
      qc.invalidateQueries({ queryKey: ["admin-users"] });
      await refetch();
      Alert.alert("Approved", "Seller can submit listings.");
    }
  }

  async function reject() {
    const { data: rpc, error } = await supabase.rpc("admin_reject_seller", {
      p_user_id: id,
      p_reason: rejectReason.trim() || "Does not meet seller guidelines",
    });
    if (error) Alert.alert("Error", error.message);
    else if (rpc && typeof rpc === "object" && "ok" in rpc && rpc.ok === false) {
      Alert.alert("Error", String((rpc as { error?: string }).error));
    } else {
      setRejectMode(false);
      setRejectReason("");
      qc.invalidateQueries({ queryKey: ["admin", "pending-sellers"] });
      qc.invalidateQueries({ queryKey: ["admin-users"] });
      await refetch();
      Alert.alert("Rejected", "User has been notified.");
    }
  }

  if (!isAdmin) {
    return (
      <Screen scroll>
        <TextTitle>Application</TextTitle>
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
  const st = String(row.seller_verification_status ?? "");
  const pending = st === "pending";
  const accountType = String(row.account_type ?? "individual");
  const idPath = (row.seller_verification_id_document_path as string | null) ?? null;
  const busPath = (row.seller_verification_business_reg_path as string | null) ?? null;

  return (
    <Screen scroll>
      <TextTitle>{String(row.display_name ?? "—")}</TextTitle>
      <TextCaption style={{ marginTop: space.sm }}>{String(row.phone ?? "")}</TextCaption>
      <TextBody style={{ marginTop: space.md }}>Status: {st}</TextBody>
      <TextCaption style={{ marginTop: space.xs }}>
        Account type: {accountType === "business" ? "Business" : "Individual"}
      </TextCaption>
      <TextCaption style={{ marginTop: space.xs }}>
        Applied:{" "}
        {row.seller_applied_at ? new Date(String(row.seller_applied_at)).toLocaleString() : "—"}
      </TextCaption>

      {pending ? (
        <View style={{ marginTop: space.lg, gap: space.sm }}>
          <TextLabel>VERIFICATION DOCUMENTS</TextLabel>
          {accountType === "individual" && idPath ? (
            <ButtonSecondary title="View ID / passport photo" onPress={() => void openDoc(idPath)} />
          ) : null}
          {accountType === "business" && busPath ? (
            <ButtonSecondary title="View business registration" onPress={() => void openDoc(busPath)} />
          ) : null}
          {pending && !idPath && !busPath ? (
            <TextCaption style={{ color: colors.textSecondary }}>No documents on file.</TextCaption>
          ) : null}
        </View>
      ) : null}

      {pending && !rejectMode ? (
        <View style={{ marginTop: space.xl, gap: space.md }}>
          <ButtonPrimary title="Approve seller" onPress={approve} />
          <ButtonSecondary title="Reject…" onPress={() => setRejectMode(true)} />
        </View>
      ) : null}

      {pending && rejectMode ? (
        <View style={{ marginTop: space.xl }}>
          <TextInput
            value={rejectReason}
            onChangeText={setRejectReason}
            placeholder="Reason for rejection"
            placeholderTextColor={colors.textMuted}
            multiline
            style={{
              borderWidth: 1,
              borderColor: colors.border,
              borderRadius: radii.md,
              padding: space.md,
              minHeight: 88,
              color: colors.text,
            }}
          />
          <View style={{ flexDirection: "row", marginTop: space.md, gap: space.sm }}>
            <View style={{ flex: 1 }}>
              <ButtonPrimary title="Confirm reject" onPress={reject} />
            </View>
            <View style={{ flex: 1 }}>
              <ButtonSecondary
                title="Cancel"
                onPress={() => {
                  setRejectMode(false);
                  setRejectReason("");
                }}
              />
            </View>
          </View>
        </View>
      ) : null}

      {!pending ? (
        <TextBody style={{ marginTop: space.lg, color: colors.textSecondary }}>
          This application is no longer pending.
        </TextBody>
      ) : null}

      <Modal visible={previewOpen} transparent animationType="fade">
        <Pressable
          style={{
            flex: 1,
            backgroundColor: "rgba(0,0,0,0.55)",
            justifyContent: "center",
            padding: space.lg,
          }}
          onPress={() => {
            setPreviewOpen(false);
            setPreviewUrl(null);
          }}
        >
          {previewUrl ? (
            <Image
              source={{ uri: previewUrl }}
              style={{ width: "100%", height: "70%", resizeMode: "contain" }}
            />
          ) : null}
        </Pressable>
      </Modal>
    </Screen>
  );
}
