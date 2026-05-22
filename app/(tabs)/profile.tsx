import { useEffect, useState } from "react";
import { Alert, View } from "react-native";
import { router } from "expo-router";
import { supabase } from "@/src/lib/supabase";
import { useAuth } from "@/src/providers/AuthProvider";
import { Screen } from "@/src/components/ui/Screen";
import { TextTitle } from "@/src/components/ui/TextTitle";
import { TextBody } from "@/src/components/ui/TextBody";
import { TextField } from "@/src/components/ui/TextField";
import { ButtonPrimary } from "@/src/components/ui/ButtonPrimary";
import { ButtonSecondary } from "@/src/components/ui/ButtonSecondary";
import { formatDisplayPhone } from "@/src/lib/phone";
import { space } from "@/src/theme/tokens";

export default function ProfileScreen() {
  const { session, profile, signOut, refreshProfile } = useAuth();
  const [name, setName] = useState(profile?.display_name ?? "");

  useEffect(() => {
    setName(profile?.display_name ?? "");
  }, [profile?.display_name]);

  async function save() {
    if (!session) return;
    const { error } = await supabase
      .from("profiles")
      .update({ display_name: name.trim() })
      .eq("id", session.user.id);
    if (error) Alert.alert("Profile", error.message);
    else {
      await refreshProfile();
      Alert.alert("Saved");
    }
  }

  if (!session) {
    return (
      <Screen scroll>
        <TextTitle>Profile</TextTitle>
        <TextBody style={{ marginTop: space.lg }}>
          Sign in with your Maldivian mobile to manage your account.
        </TextBody>
        <ButtonPrimary
          title="Log in"
          onPress={() => router.push("/(auth)/login")}
          style={{ marginTop: space.lg }}
        />
      </Screen>
    );
  }

  return (
    <Screen scroll>
      <TextTitle>Profile</TextTitle>
      {profile?.suspended_at ? (
        <TextBody style={{ marginTop: space.md, color: "#c00" }}>
          Your account is suspended. Contact support.
        </TextBody>
      ) : null}
      <TextBody style={{ marginTop: space.md }}>
        Phone:{" "}
        {profile?.phone
          ? formatDisplayPhone(profile.phone)
          : session.user.phone ?? "—"}
      </TextBody>
      <TextBody style={{ marginTop: space.sm }}>
        Role: {profile?.role ?? "buyer"}
      </TextBody>
      <TextField
        label="DISPLAY NAME"
        value={name}
        onChangeText={setName}
        style={{ marginTop: space.lg }}
      />
      <ButtonPrimary title="Save profile" onPress={save} />
      <ButtonPrimary
        title="My auctions"
        onPress={() => router.push("/my-auctions")}
        style={{ marginTop: space.md }}
      />
      <ButtonPrimary
        title="Won auctions"
        onPress={() => router.push("/won")}
        style={{ marginTop: space.sm }}
      />
      {profile?.role === "admin" ? (
        <ButtonPrimary
          title="Admin dashboard"
          onPress={() => router.push("/admin")}
          style={{ marginTop: space.sm }}
        />
      ) : null}
      <ButtonSecondary
        title="Log out"
        onPress={() => signOut()}
        style={{ marginTop: space.xl }}
      />
    </Screen>
  );
}
