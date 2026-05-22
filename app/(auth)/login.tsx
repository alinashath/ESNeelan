import { useState } from "react";
import { Alert, View } from "react-native";
import { Link, router } from "expo-router";
import { supabase } from "@/src/lib/supabase";
import { toE164Maldives } from "@/src/lib/phone";
import { Screen } from "@/src/components/ui/Screen";
import { TextField } from "@/src/components/ui/TextField";
import { TextTitle } from "@/src/components/ui/TextTitle";
import { TextBody } from "@/src/components/ui/TextBody";
import { ButtonPrimary } from "@/src/components/ui/ButtonPrimary";
import { space } from "@/src/theme/tokens";

export default function LoginScreen() {
  const [phone, setPhone] = useState("");
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);

  async function sendOtp() {
    const e164 = toE164Maldives(phone);
    if (!e164) {
      Alert.alert("Invalid number", "Enter a Maldivian mobile (7 digits or +960…).");
      return;
    }
    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithOtp({
        phone: e164,
        options: {
          shouldCreateUser: true,
          data: { display_name: name.trim() || "Bidder" },
        },
      });
      if (error) throw error;
      router.push({
        pathname: "/(auth)/verify",
        params: { phone: e164 },
      });
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Could not send code";
      Alert.alert("SMS", msg);
    } finally {
      setLoading(false);
    }
  }

  return (
    <Screen scroll>
      <TextTitle style={{ marginBottom: space.sm }}>Log in or sign up</TextTitle>
      <TextBody style={{ marginBottom: space.xl }}>
        We will send a one-time code to your Maldivian mobile number via MsgOwl
        (configured on Supabase).
      </TextBody>
      <TextField
        label="DISPLAY NAME (OPTIONAL)"
        placeholder="Your name"
        value={name}
        onChangeText={setName}
        autoCapitalize="words"
      />
      <TextField
        label="MOBILE NUMBER"
        placeholder="7XXXXXX or +9607XXXXXX"
        keyboardType="phone-pad"
        value={phone}
        onChangeText={setPhone}
      />
      <ButtonPrimary title="Send code" loading={loading} onPress={sendOtp} />
      <View style={{ marginTop: space.xl }}>
        <Link href="/(tabs)" asChild>
          <TextBody style={{ textDecorationLine: "underline" }}>Back to home</TextBody>
        </Link>
      </View>
    </Screen>
  );
}
