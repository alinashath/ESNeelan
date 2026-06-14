import { useState, useCallback } from "react";
import { Alert, Image, Pressable, View } from "react-native";
import * as ImagePicker from "expo-image-picker";
import { router, useFocusEffect, type Href } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { supabase } from "@/src/lib/supabase";
import { useAuth } from "@/src/providers/AuthProvider";
import { Screen } from "@/src/components/ui/Screen";
import { TextTitle } from "@/src/components/ui/TextTitle";
import { TextBody } from "@/src/components/ui/TextBody";
import { TextCaption } from "@/src/components/ui/TextCaption";
import { TextLabel } from "@/src/components/ui/TextLabel";
import { ButtonPrimary } from "@/src/components/ui/ButtonPrimary";
import { ButtonSecondary } from "@/src/components/ui/ButtonSecondary";
import { InfoCallout } from "@/src/components/ui/InfoCallout";
import { colors, radii, space } from "@/src/theme/tokens";

const BUCKET = "seller-verification-docs";

function rpcErrorMessage(code: string | undefined): string {
  switch (code) {
    case "id_document_required":
      return "Please upload a photo of your ID or passport.";
    case "invalid_id_document_path":
      return "ID document upload failed validation. Try uploading again.";
    case "business_registration_required":
      return "Please upload your business registration document.";
    case "invalid_business_registration_path":
      return "Business document upload failed validation. Try uploading again.";
    case "invalid_account_type":
      return "Set your account type to Individual or Business in Edit profile, then try again.";
    case "invalid_state":
      return "You cannot submit a request in your current verification state.";
    case "not_authenticated":
      return "Sign in to continue.";
    default:
      return code ? `Request failed (${code}).` : "Request failed.";
  }
}

export default function SellerVerificationScreen() {
  const { session, profile, refreshProfile } = useAuth();
  const [idUri, setIdUri] = useState<string | null>(null);
  const [businessUri, setBusinessUri] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useFocusEffect(
    useCallback(() => {
      void refreshProfile();
    }, [refreshProfile]),
  );

  const accountType = profile?.account_type ?? "individual";
  const status = profile?.seller_verification_status ?? "none";

  async function pick(setter: (u: string | null) => void) {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert("Permission", "Photo library access is required.");
      return;
    }
    const res = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.8,
    });
    if (res.canceled || !res.assets[0]) return;
    setter(res.assets[0].uri);
  }

  async function uploadObject(localUri: string, suffix: string): Promise<string> {
    if (!session?.user.id) throw new Error("Not signed in.");
    const ext = localUri.toLowerCase().includes(".png") ? "png" : "jpg";
    const path = `${session.user.id}/${suffix}_${Date.now()}.${ext}`;
    const res = await fetch(localUri);
    if (!res.ok) throw new Error("Could not read the image.");
    const buf = await res.arrayBuffer();
    const body = new Uint8Array(buf);
    const mime = ext === "png" ? "image/png" : "image/jpeg";
    const { error } = await supabase.storage.from(BUCKET).upload(path, body, {
      contentType: mime,
      upsert: true,
    });
    if (error) throw error;
    return path;
  }

  async function submit() {
    if (!session?.user.id) return;
    if (status === "pending") {
      Alert.alert("Pending", "Your documents are already being reviewed.");
      return;
    }
    if (status === "approved") {
      Alert.alert("Verified", "You are already approved to sell.");
      return;
    }

    if (accountType === "individual" && !idUri) {
      Alert.alert("Document required", "Upload a clear photo of your government ID or passport.");
      return;
    }
    if (accountType === "business" && !businessUri) {
      Alert.alert("Document required", "Upload your business registration certificate.");
      return;
    }

    setBusy(true);
    try {
      let idPath = "";
      let busPath = "";
      if (accountType === "individual") {
        idPath = await uploadObject(idUri!, "id");
      } else {
        busPath = await uploadObject(businessUri!, "business");
      }

      const { data: rpc, error } = await supabase.rpc("request_seller_verification", {
        p_id_document_path: idPath,
        p_business_registration_path: busPath,
      });
      if (error) {
        Alert.alert("Error", error.message);
        return;
      }
      const r = rpc as { ok?: boolean; error?: string; state?: string };
      if (r?.ok === false) {
        Alert.alert("Cannot submit", rpcErrorMessage(r.error));
        return;
      }
      if (r?.state === "already_pending") {
        Alert.alert("Pending", "Your application is already being reviewed.");
      } else if (r?.state === "already_approved") {
        Alert.alert("Verified", "You are already approved to sell.");
      } else {
        Alert.alert("Submitted", "An administrator will review your documents.");
      }
      await refreshProfile();
      router.replace("/(tabs)/profile" as Href);
    } catch (e: unknown) {
      Alert.alert("Error", e instanceof Error ? e.message : "Upload failed");
    } finally {
      setBusy(false);
    }
  }

  if (!session) {
    return (
      <Screen scroll>
        <TextTitle>Seller verification</TextTitle>
        <TextBody style={{ marginTop: space.lg }}>Sign in to continue.</TextBody>
      </Screen>
    );
  }

  if (profile?.role === "admin") {
    return (
      <Screen scroll>
        <TextTitle>Seller verification</TextTitle>
        <TextBody style={{ marginTop: space.lg }}>
          Admin accounts may list without seller verification.
        </TextBody>
        <ButtonSecondary title="Back" onPress={() => router.back()} style={{ marginTop: space.lg }} />
      </Screen>
    );
  }

  return (
    <Screen scroll>
      <TextTitle>Seller verification</TextTitle>
      <TextCaption style={{ marginTop: space.xs, color: colors.textMuted }}>
        Account type: {accountType === "business" ? "Business" : "Individual"} — change in Edit profile if
        needed.
      </TextCaption>

      {status === "pending" ? (
        <View style={{ marginTop: space.lg }}>
          <InfoCallout message="Your documents are with an administrator for review. You will be notified when a decision is made." />
        </View>
      ) : null}

      {status === "approved" ? (
        <View style={{ marginTop: space.lg }}>
          <InfoCallout message="You are verified to sell. You can submit listings from Create." />
        </View>
      ) : null}

      {status === "rejected" && profile?.seller_verification_note ? (
        <View style={{ marginTop: space.lg }}>
          <InfoCallout
            message={`Previous application was not approved: ${profile.seller_verification_note}. You can submit again below.`}
          />
        </View>
      ) : null}

      {(status === "none" || status === "rejected") && (
        <>
          <TextBody style={{ marginTop: space.lg, color: colors.textSecondary }}>
            {accountType === "individual"
              ? "Upload a readable photo of a government-issued ID or passport (your name must match your profile)."
              : "Upload a clear image or scan of your business registration certificate."}
          </TextBody>

          {accountType === "individual" ? (
            <View style={{ marginTop: space.lg }}>
              <TextLabel style={{ marginBottom: space.sm }}>ID OR PASSPORT PHOTO</TextLabel>
              <Pressable
                onPress={() => void pick(setIdUri)}
                style={{
                  borderWidth: 2,
                  borderStyle: "dashed",
                  borderColor: colors.border,
                  borderRadius: radii.lg,
                  padding: space.lg,
                  backgroundColor: colors.surfaceMuted,
                  alignItems: "center",
                }}
              >
                <Ionicons name="id-card-outline" size={36} color={colors.textMuted} />
                <TextBody style={{ fontWeight: "600", marginTop: space.sm }}>Choose photo</TextBody>
              </Pressable>
              {idUri ? (
                <Image
                  source={{ uri: idUri }}
                  style={{
                    marginTop: space.md,
                    width: "100%",
                    height: 200,
                    borderRadius: radii.lg,
                    backgroundColor: colors.surfaceMuted,
                  }}
                />
              ) : null}
            </View>
          ) : (
            <View style={{ marginTop: space.lg }}>
              <TextLabel style={{ marginBottom: space.sm }}>BUSINESS REGISTRATION</TextLabel>
              <Pressable
                onPress={() => void pick(setBusinessUri)}
                style={{
                  borderWidth: 2,
                  borderStyle: "dashed",
                  borderColor: colors.border,
                  borderRadius: radii.lg,
                  padding: space.lg,
                  backgroundColor: colors.surfaceMuted,
                  alignItems: "center",
                }}
              >
                <Ionicons name="document-text-outline" size={36} color={colors.textMuted} />
                <TextBody style={{ fontWeight: "600", marginTop: space.sm }}>Choose document</TextBody>
              </Pressable>
              {businessUri ? (
                <Image
                  source={{ uri: businessUri }}
                  style={{
                    marginTop: space.md,
                    width: "100%",
                    height: 200,
                    borderRadius: radii.lg,
                    backgroundColor: colors.surfaceMuted,
                  }}
                />
              ) : null}
            </View>
          )}

          <View style={{ marginTop: space.xl, gap: space.md }}>
            <ButtonPrimary title="Submit for verification" loading={busy} onPress={() => void submit()} />
            <ButtonSecondary title="Cancel" onPress={() => router.back()} />
          </View>
        </>
      )}

      {(status === "pending" || status === "approved") && (
        <ButtonSecondary title="Back to profile" onPress={() => router.back()} style={{ marginTop: space.xl }} />
      )}
    </Screen>
  );
}
