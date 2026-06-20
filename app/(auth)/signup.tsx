import { useState } from "react";
import { Pressable, View } from "react-native";
import { Link, router, type Href } from "expo-router";
import { supabase } from "@/src/lib/supabase";
import { toE164Maldives } from "@/src/lib/phone";
import { authErrorMessage } from "@/src/lib/auth-errors";
import { OtpBoxInput } from "@/src/components/ui/OtpBoxInput";
import { Screen } from "@/src/components/ui/Screen";
import { TextField } from "@/src/components/ui/TextField";
import { TextTitle } from "@/src/components/ui/TextTitle";
import { TextBody } from "@/src/components/ui/TextBody";
import { TextCaption } from "@/src/components/ui/TextCaption";
import { ButtonPrimary } from "@/src/components/ui/ButtonPrimary";
import { colors, space } from "@/src/theme/tokens";

export default function SignupScreen() {
  const [name, setName] = useState("");
  const [phoneDigits, setPhoneDigits] = useState("");
  const [loading, setLoading] = useState(false);
  const [nameError, setNameError] = useState<string | null>(null);
  const [phoneError, setPhoneError] = useState<string | null>(null);

  async function sendOtp() {
    setNameError(null);
    setPhoneError(null);

    const trimmedName = name.trim();
    if (!trimmedName) {
      setNameError("Your name is required to sign up.");
      return;
    }

    const e164 = toE164Maldives(phoneDigits);
    if (!e164) {
      setPhoneError("Enter your 7-digit Maldivian mobile number.");
      return;
    }

    setLoading(true);
    try {
      const { error: otpError } = await supabase.auth.signInWithOtp({
        phone: e164,
        options: {
          shouldCreateUser: true,
          data: { display_name: trimmedName },
        },
      });
      if (otpError) throw otpError;
      router.push({
        pathname: "/(auth)/verify",
        params: { phone: e164, mode: "signup" },
      });
    } catch (e: unknown) {
      setPhoneError(authErrorMessage(e, "send_otp_signup"));
    } finally {
      setLoading(false);
    }
  }

  return (
    <Screen scroll>
      <TextTitle style={{ marginBottom: space.sm }}>Sign up</TextTitle>
      <TextBody style={{ marginBottom: space.xl }}>
        Create your account with your name and Maldivian mobile number.
      </TextBody>
      <TextField
        label="FULL NAME"
        placeholder="Your name"
        value={name}
        onChangeText={(next) => {
          setName(next);
          if (nameError) setNameError(null);
        }}
        autoCapitalize="words"
        autoComplete="name"
      />
      {nameError ? (
        <TextCaption style={{ marginTop: -space.md, marginBottom: space.lg, color: colors.danger }}>
          {nameError}
        </TextCaption>
      ) : null}
      <OtpBoxInput
        label="MOBILE NUMBER"
        prefix="+960"
        length={7}
        value={phoneDigits}
        onChange={(next) => {
          setPhoneDigits(next);
          if (phoneError) setPhoneError(null);
        }}
        error={phoneError}
      />
      <ButtonPrimary title="Send code" loading={loading} onPress={sendOtp} />
      <View style={{ marginTop: space.xl, gap: space.md }}>
        <TextCaption>
          Already have an account?{" "}
          <Link href={"/(auth)/login" as Href} asChild>
            <Pressable accessibilityRole="link">
              <TextCaption style={{ textDecorationLine: "underline" }}>Log in</TextCaption>
            </Pressable>
          </Link>
        </TextCaption>
        <Link href="/(tabs)" asChild>
          <Pressable accessibilityRole="link">
            <TextBody style={{ textDecorationLine: "underline" }}>Back to home</TextBody>
          </Pressable>
        </Link>
      </View>
    </Screen>
  );
}
