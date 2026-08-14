import { ButtonPrimary } from "@/src/components/ui/ButtonPrimary";
import { Checkbox } from "@/src/components/ui/Checkbox";
import { Screen } from "@/src/components/ui/Screen";
import { TextBody } from "@/src/components/ui/TextBody";
import { TextCaption } from "@/src/components/ui/TextCaption";
import { TextTitle } from "@/src/components/ui/TextTitle";
import { supabase } from "@/src/lib/supabase";
import { useAuth } from "@/src/providers/AuthProvider";
import { colors, space } from "@/src/theme/tokens";
import { router } from "expo-router";
import { useState } from "react";
import { Alert, View } from "react-native";

export default function DeleteAccountScreen() {
  const { session, signOut } = useAuth();
  const [confirmed, setConfirmed] = useState(false);
  const [busy, setBusy] = useState(false);

  async function deleteAccount() {
    if (!session || !confirmed) return;
    Alert.alert("Permanently delete account?", "This cannot be undone. Your profile, listings, bids, uploads, and account credentials will be deleted.", [
      { text: "Cancel", style: "cancel" },
      { text: "Delete permanently", style: "destructive", onPress: () => void performDelete() },
    ]);
  }
  async function performDelete() {
    setBusy(true);
    try {
      const { error } = await supabase.functions.invoke("delete-account", { body: {} });
      if (error) throw error;
      await signOut();
      Alert.alert("Account deleted", "Your account and associated data have been permanently deleted.", [
        { text: "Done", onPress: () => router.replace("/(tabs)") },
      ]);
    } catch (e) {
      Alert.alert("Could not delete account", e instanceof Error ? e.message : "Please try again or contact support.");
    } finally { setBusy(false); }
  }

  return (
    <Screen scroll>
      <TextTitle>Delete account</TextTitle>
      <TextBody style={{ marginTop: space.md, color: colors.textSecondary }}>
        Deletion is permanent. It removes your sign-in credentials and associated marketplace data rather than temporarily deactivating your account.
      </TextBody>
      <View style={{ marginTop: space.xl, padding: space.lg, borderWidth: 1, borderColor: colors.danger }}>
        <TextBody style={{ color: colors.danger, fontWeight: "600" }}>This action cannot be undone.</TextBody>
        <TextCaption style={{ marginTop: space.sm }}>Any active listings and bids will also be removed.</TextCaption>
      </View>
      <View style={{ marginTop: space.xl }}>
        <Checkbox checked={confirmed} onToggle={() => setConfirmed((v) => !v)} label="I understand that my account and data will be permanently deleted." />
      </View>
      <ButtonPrimary title="Delete my account" loading={busy} disabled={!confirmed} onPress={deleteAccount} style={{ marginTop: space.xl, backgroundColor: colors.danger }} />
    </Screen>
  );
}
