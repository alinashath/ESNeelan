import { View } from "react-native";
import { router } from "expo-router";
import { useAuth } from "@/src/providers/AuthProvider";
import { useWonAuctions } from "@/src/data/user-auctions";
import { Screen } from "@/src/components/ui/Screen";
import { TextTitle } from "@/src/components/ui/TextTitle";
import { TextBody } from "@/src/components/ui/TextBody";
import { TextCaption } from "@/src/components/ui/TextCaption";
import { ButtonPrimary } from "@/src/components/ui/ButtonPrimary";
import { space } from "@/src/theme/tokens";

export default function WonAuctionsScreen() {
  const { session } = useAuth();
  const { data } = useWonAuctions();

  if (!session) {
    return (
      <Screen scroll>
        <TextTitle>Won auctions</TextTitle>
        <ButtonPrimary title="Log in" onPress={() => router.push("/(auth)/login")} />
      </Screen>
    );
  }

  return (
    <Screen scroll>
      <TextTitle>Won auctions</TextTitle>
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
          {a.payment_instructions ? (
            <TextBody style={{ marginTop: space.sm }}>
              {String(a.payment_instructions)}
            </TextBody>
          ) : null}
          <ButtonPrimary
            title="View"
            onPress={() => router.push(`/auction/${String(a.id)}`)}
            style={{ marginTop: space.md }}
          />
        </View>
      ))}
    </Screen>
  );
}
