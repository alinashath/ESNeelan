import { Alert, View } from "react-native";
import { router } from "expo-router";
import { supabase } from "@/src/lib/supabase";
import { useAuth } from "@/src/providers/AuthProvider";
import { useMyAuctions } from "@/src/data/user-auctions";
import { Screen } from "@/src/components/ui/Screen";
import { TextTitle } from "@/src/components/ui/TextTitle";
import { TextBody } from "@/src/components/ui/TextBody";
import { TextCaption } from "@/src/components/ui/TextCaption";
import { ButtonPrimary } from "@/src/components/ui/ButtonPrimary";
import { space } from "@/src/theme/tokens";

export default function MyAuctionsScreen() {
  const { session } = useAuth();
  const { data, refetch } = useMyAuctions();

  if (!session) {
    return (
      <Screen scroll>
        <TextTitle>My auctions</TextTitle>
        <ButtonPrimary title="Log in" onPress={() => router.push("/(auth)/login")} />
      </Screen>
    );
  }

  return (
    <Screen scroll>
      <TextTitle>My auctions</TextTitle>
      <TextCaption style={{ marginTop: space.sm }}>
        Drafts, pending approval, and live listings.
      </TextCaption>
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
          <TextCaption style={{ marginTop: space.xs }}>{String(a.status)}</TextCaption>
          <ButtonPrimary
            title="Open"
            onPress={() => router.push(`/auction/${String(a.id)}`)}
            style={{ marginTop: space.md }}
          />
          {String(a.status) === "won" ? (
            <ButtonPrimary
              title="Mark paid (seller)"
              onPress={async () => {
                const { data: rpc, error } = await supabase.rpc("seller_mark_auction_paid", {
                  p_auction_id: String(a.id),
                });
                if (error) Alert.alert("Error", error.message);
                else if (rpc && typeof rpc === "object" && "ok" in rpc && rpc.ok === false) {
                  Alert.alert("Error", String((rpc as { error?: string }).error));
                } else {
                  refetch();
                }
              }}
              style={{ marginTop: space.sm }}
            />
          ) : null}
        </View>
      ))}
    </Screen>
  );
}
