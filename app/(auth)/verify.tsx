import { useState } from "react";
import { View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { supabase } from "@/src/lib/supabase";
import { authErrorMessage } from "@/src/lib/auth-errors";
import { formatDisplayPhone } from "@/src/lib/phone";
import { promoteAdminIfAllowed } from "@/src/lib/functions";
import { useAuth } from "@/src/providers/AuthProvider";
import { OtpBoxInput } from "@/src/components/ui/OtpBoxInput";
import { ButtonPrimary } from "@/src/components/ui/ButtonPrimary";
import { Screen } from "@/src/components/ui/Screen";
import { TextBody } from "@/src/components/ui/TextBody";
import { TextCaption } from "@/src/components/ui/TextCaption";
import { TextTitle } from "@/src/components/ui/TextTitle";
import { space } from "@/src/theme/tokens";

const OTP_LENGTH = 6;

export default function VerifyScreen() {
  const { phone, mode } = useLocalSearchParams<{ phone?: string; mode?: string }>();
  const { refreshProfile } = useAuth();
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const phoneE164 = typeof phone === "string" ? phone : "";
  const isSignup = mode === "signup";
  const displayPhone = phoneE164 ? formatDisplayPhone(phoneE164) : "";

  async function verify() {
    setError(null);
    if (!phoneE164) {
      setError("Missing phone number. Go back and request a new code.");
      return;
    }
    const token = code.replace(/\D/g, "").trim();
    if (token.length !== OTP_LENGTH) {
      setError(`Enter the ${OTP_LENGTH}-digit code from your SMS.`);
      return;
    }

    setLoading(true);
    try {
      const { data, error: verifyError } = await supabase.auth.verifyOtp({
        phone: phoneE164,
        token,
        type: "sms",
      });
      if (verifyError) throw verifyError;
      const accessToken = data.session?.access_token;
      if (accessToken) {
        await promoteAdminIfAllowed(accessToken);
        await refreshProfile();
      }
      router.replace("/(tabs)");
    } catch (e: unknown) {
      setError(authErrorMessage(e, "verify_otp"));
    } finally {
      setLoading(false);
    }
  }

  return (
    <Screen scroll>
      <TextTitle style={{ marginBottom: space.sm }}>Enter code</TextTitle>
      <TextBody style={{ marginBottom: space.xl }}>
        {phoneE164
          ? `We sent a ${OTP_LENGTH}-digit code to ${displayPhone}.`
          : "Go back and request a new code."}
      </TextBody>
      <OtpBoxInput
        label="VERIFICATION CODE"
        length={OTP_LENGTH}
        value={code}
        onChange={(next) => {
          setCode(next);
          if (error) setError(null);
        }}
        error={error}
        autoFocus
      />
      <ButtonPrimary
        title={isSignup ? "Verify & create account" : "Verify & log in"}
        loading={loading}
        onPress={verify}
      />
      <View style={{ marginTop: space.lg }}>
        <TextCaption>
          Wrong number? Go back to {isSignup ? "sign up" : "log in"} and try again.
        </TextCaption>
      </View>
    </Screen>
  );
}
