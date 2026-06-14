import { ButtonPrimary } from "@/src/components/ui/ButtonPrimary";
import { Screen } from "@/src/components/ui/Screen";
import { TextBody } from "@/src/components/ui/TextBody";
import { TextField } from "@/src/components/ui/TextField";
import { TextTitle } from "@/src/components/ui/TextTitle";
import { promoteAdminIfAllowed } from "@/src/lib/functions";
import { supabase } from "@/src/lib/supabase";
import { useAuth } from "@/src/providers/AuthProvider";
import { space } from "@/src/theme/tokens";
import { router, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { Alert } from "react-native";

export default function VerifyScreen() {
  const { phone } = useLocalSearchParams<{ phone: string }>();
  const { refreshProfile } = useAuth();
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);

  async function verify() {
    if (!phone) {
      Alert.alert("Missing phone", "Go back and request a new code.");
      return;
    }
    setLoading(true);
    try {
      const { data, error } = await supabase.auth.verifyOtp({
        phone,
        token: code.trim(),
        type: "sms",
      });
      if (error) throw error;
      const token = data.session?.access_token;
      if (token) {
        await promoteAdminIfAllowed(token);
        await refreshProfile();
      }
      router.replace("/(tabs)");
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Invalid code";
      Alert.alert("Verify", msg);
    } finally {
      setLoading(false);
    }
  }

  return (
    <Screen scroll>
      <TextTitle style={{ marginBottom: space.sm }}>Enter code</TextTitle>
      <TextBody style={{ marginBottom: space.xl }}>
        We sent a 6-digit code to {phone}.
      </TextBody>
      <TextField
        label="CODE"
        placeholder="123456"
        keyboardType="number-pad"
        value={code}
        onChangeText={setCode}
        maxLength={8}
      />
      <ButtonPrimary
        title="Verify & continue"
        loading={loading}
        onPress={verify}
      />
    </Screen>
  );
}
