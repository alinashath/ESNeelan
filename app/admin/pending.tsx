import { Alert, View } from "react-native";
import { supabase } from "@/src/lib/supabase";
import { usePendingApprovals } from "@/src/data/user-auctions";
import { Screen } from "@/src/components/ui/Screen";
import { TextTitle } from "@/src/components/ui/TextTitle";
import { TextBody } from "@/src/components/ui/TextBody";
import { TextCaption } from "@/src/components/ui/TextCaption";
import { ButtonPrimary } from "@/src/components/ui/ButtonPrimary";
import { ButtonSecondary } from "@/src/components/ui/ButtonSecondary";
import { space } from "@/src/theme/tokens";

export default function AdminPendingScreen() {
  const { data, refetch } = usePendingApprovals();

  async function approve(id: string) {
    const { data: rpc, error } = await supabase.rpc("admin_approve_auction", {
      p_auction_id: id,
    });
    if (error) Alert.alert("Error", error.message);
    else if (rpc && typeof rpc === "object" && "ok" in rpc && rpc.ok === false) {
      Alert.alert("Error", String((rpc as { error?: string }).error));
    } else refetch();
  }

  async function reject(id: string) {
    const { data: rpc, error } = await supabase.rpc("admin_reject_auction", {
      p_auction_id: id,
      p_reason: "Does not meet guidelines",
    });
    if (error) Alert.alert("Error", error.message);
    else if (rpc && typeof rpc === "object" && "ok" in rpc && rpc.ok === false) {
      Alert.alert("Error", String((rpc as { error?: string }).error));
    } else refetch();
  }

  return (
    <Screen scroll>
      <TextTitle>Pending approval</TextTitle>
      {(data as Record<string, unknown>[] | undefined)?.map((a) => (
        <View
          key={String(a.id)}
          style={{
            borderWidth: 1,
            borderColor: "#eee",
            borderRadius: 12,
            padding: space.lg,
            marginTop: space.md,
          }}
        >
          <TextBody style={{ fontWeight: "700" }}>{String(a.title)}</TextBody>
          <TextCaption style={{ marginTop: space.xs }}>
            Seller {String(a.seller_id).slice(0, 8)}…
          </TextCaption>
          <View style={{ flexDirection: "row", marginTop: space.md }}>
            <View style={{ flex: 1, marginRight: space.sm }}>
              <ButtonPrimary title="Approve" onPress={() => approve(String(a.id))} />
            </View>
            <View style={{ flex: 1 }}>
              <ButtonSecondary title="Reject" onPress={() => reject(String(a.id))} />
            </View>
          </View>
        </View>
      ))}
    </Screen>
  );
}
