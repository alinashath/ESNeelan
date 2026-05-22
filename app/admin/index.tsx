import { View } from "react-native";
import { router } from "expo-router";
import { useAuth } from "@/src/providers/AuthProvider";
import { Screen } from "@/src/components/ui/Screen";
import { TextTitle } from "@/src/components/ui/TextTitle";
import { TextBody } from "@/src/components/ui/TextBody";
import { ButtonPrimary } from "@/src/components/ui/ButtonPrimary";
import { space } from "@/src/theme/tokens";

export default function AdminHome() {
  const { profile } = useAuth();
  if (profile?.role !== "admin") {
    return (
      <Screen scroll>
        <TextTitle>Admin</TextTitle>
        <TextBody style={{ marginTop: space.lg }}>You do not have admin access.</TextBody>
      </Screen>
    );
  }
  return (
    <Screen scroll>
      <TextTitle>Admin dashboard</TextTitle>
      <ButtonPrimary
        title="Pending listings"
        onPress={() => router.push("/admin/pending")}
        style={{ marginTop: space.lg }}
      />
      <ButtonPrimary
        title="Users"
        onPress={() => router.push("/admin/users")}
        style={{ marginTop: space.md }}
      />
    </Screen>
  );
}
