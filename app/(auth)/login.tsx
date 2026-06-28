import { useState } from "react";
import { Pressable, View } from "react-native";
import { APP_DISPLAY_NAME } from "@/src/lib/brand";
import { supabase } from "@/src/lib/supabase";
import { toE164Maldives } from "@/src/lib/phone";
import { authErrorMessage } from "@/src/lib/auth-errors";
import { OtpBoxInput } from "@/src/components/ui/OtpBoxInput";
import { Screen } from "@/src/components/ui/Screen";
import { TextTitle } from "@/src/components/ui/TextTitle";
import { TextBody } from "@/src/components/ui/TextBody";
import { TextCaption } from "@/src/components/ui/TextCaption";
import { ButtonPrimary } from "@/src/components/ui/ButtonPrimary";
import { space } from "@/src/theme/tokens";

export default function LoginScreen() {
  const [phoneDigits, setPhoneDigits] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function sendOtp() {
    setError(null);
    const e164 = toE164Maldives(phoneDigits);
    if (!e164) {
      setError("Enter your 7-digit Maldivian mobile number.");
      return;
    }
    setLoading(true);
    try {
      const { error: otpError } = await supabase.auth.signInWithOtp({
        phone: e164,
        options: { shouldCreateUser: false },
      });
      if (otpError) throw otpError;
      router.push({
        pathname: "/(auth)/verify",
        params: { phone: e164, mode: "login" },
      });
    } catch (e: unknown) {
      setError(authErrorMessage(e, "send_otp_login"));
    } finally {
      setLoading(false);
    }
  }

  return (
    <Screen scroll>
      <TextTitle style={{ marginBottom: space.sm }}>Log in</TextTitle>
      <TextBody style={{ marginBottom: space.xl }}>
        Enter your mobile number and we will text you a one-time code.
      </TextBody>
      <OtpBoxInput
        label="MOBILE NUMBER"
        prefix="+960"
        length={7}
        value={phoneDigits}
        onChange={(next) => {
          setPhoneDigits(next);
          if (error) setError(null);
        }}
        error={error}
        autoFocus
      />
      <ButtonPrimary title="Send code" loading={loading} onPress={sendOtp} />
      <View style={{ marginTop: space.xl, gap: space.md }}>
        <TextCaption>
          New to {APP_DISPLAY_NAME}?{" "}
          <Link href={"/(auth)/signup" as Href} asChild>
            <Pressable accessibilityRole="link">
              <TextCaption style={{ textDecorationLine: "underline" }}>Create an account</TextCaption>
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
