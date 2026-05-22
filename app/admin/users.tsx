import { Alert, View } from "react-native";
import { supabase } from "@/src/lib/supabase";
import { useAdminUsers } from "@/src/data/user-auctions";
import { Screen } from "@/src/components/ui/Screen";
import { TextTitle } from "@/src/components/ui/TextTitle";
import { TextBody } from "@/src/components/ui/TextBody";
import { TextCaption } from "@/src/components/ui/TextCaption";
import { ButtonSecondary } from "@/src/components/ui/ButtonSecondary";
import { space } from "@/src/theme/tokens";

export default function AdminUsersScreen() {
  const { data, refetch } = useAdminUsers();

  async function suspend(id: string, suspend: boolean) {
    const { data: rpc, error } = await supabase.rpc("admin_set_user_suspended", {
      p_user_id: id,
      p_suspend: suspend,
    });
    if (error) Alert.alert("Error", error.message);
    else if (rpc && typeof rpc === "object" && "ok" in rpc && rpc.ok === false) {
      Alert.alert("Error", String((rpc as { error?: string }).error));
    } else refetch();
  }

  return (
    <Screen scroll>
      <TextTitle>Users</TextTitle>
      {(data as Record<string, unknown>[] | undefined)?.map((u) => (
        <View
          key={String(u.id)}
          style={{
            borderWidth: 1,
            borderColor: "#eee",
            borderRadius: 12,
            padding: space.lg,
            marginTop: space.md,
          }}
        >
          <TextBody style={{ fontWeight: "700" }}>
            {String(u.display_name ?? "—")}
          </TextBody>
          <TextCaption>{String(u.phone ?? "")}</TextCaption>
          <TextCaption style={{ marginTop: space.xs }}>Role: {String(u.role)}</TextCaption>
          <TextCaption>
            {u.suspended_at ? `Suspended: ${String(u.suspended_at)}` : "Active"}
          </TextCaption>
          <ButtonSecondary
            title={u.suspended_at ? "Unsuspend" : "Suspend"}
            onPress={() => suspend(String(u.id), !u.suspended_at)}
            style={{ marginTop: space.md }}
          />
        </View>
      ))}
    </Screen>
  );
}
