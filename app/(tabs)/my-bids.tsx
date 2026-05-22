import { useCallback, useMemo, useState } from "react";
import { View } from "react-native";
import { router, useFocusEffect } from "expo-router";
import { useMyBids } from "@/src/data/user-auctions";
import { useAuth } from "@/src/providers/AuthProvider";
import { Screen } from "@/src/components/ui/Screen";
import { TextTitle } from "@/src/components/ui/TextTitle";
import { TextBody } from "@/src/components/ui/TextBody";
import { TextCaption } from "@/src/components/ui/TextCaption";
import { Chip } from "@/src/components/ui/Chip";
import { ChipRow } from "@/src/components/ui/ChipRow";
import { ButtonPrimary } from "@/src/components/ui/ButtonPrimary";
import { ValueCurrency } from "@/src/components/ui/ValueCurrency";
import { Countdown } from "@/src/components/ui/Countdown";
import { BadgeLeading } from "@/src/components/ui/BadgeLeading";
import { BadgeOutbid } from "@/src/components/ui/BadgeOutbid";
import { space } from "@/src/theme/tokens";

type TabKey = "active" | "won";

export default function MyBidsScreen() {
  const { session } = useAuth();
  const [tab, setTab] = useState<TabKey>("active");
  const { data: rows, refetch } = useMyBids();

  useFocusEffect(
    useCallback(() => {
      if (session) refetch();
    }, [refetch, session]),
  );

  const rowsTyped = rows as
    | {
        id: string;
        amount: number;
        created_at: string;
        auction_id: string;
        auctions: {
          id: string;
          title: string;
          status: string;
          ends_at: string;
          current_highest_bid: number | null;
          starting_price: number;
          seller_id: string;
        } | null;
      }[]
    | undefined;

  const filtered = useMemo(() => {
    const list = rowsTyped ?? [];
    if (tab === "active") {
      return list.filter((r) => r.auctions?.status === "active");
    }
    return list.filter((r) =>
      ["won", "paid", "completed", "ended"].includes(r.auctions?.status ?? ""),
    );
  }, [rowsTyped, tab]);

  if (!session) {
    return (
      <Screen scroll>
        <TextTitle>My bids</TextTitle>
        <TextBody style={{ marginTop: space.lg }}>
          Sign in to track your bidding activity.
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
      <TextTitle style={{ marginBottom: space.md }}>My activity</TextTitle>
      <ChipRow>
        <Chip title="Active bids" selected={tab === "active"} onPress={() => setTab("active")} />
        <Chip title="Won / past" selected={tab === "won"} onPress={() => setTab("won")} />
        <Chip
          title="My listings"
          selected={false}
          onPress={() => router.push("/my-auctions")}
        />
      </ChipRow>

      {filtered.length === 0 ? (
        <TextCaption style={{ marginTop: space.lg }}>Nothing here yet.</TextCaption>
      ) : (
        filtered.map((r) => {
          const a = r.auctions;
          if (!a) return null;
          const leading =
            a.current_highest_bid != null &&
            Number(a.current_highest_bid) === Number(r.amount);
          return (
            <View
              key={r.id}
              style={{
                borderWidth: 1,
                borderColor: "#eee",
                borderRadius: 12,
                padding: space.lg,
                marginTop: space.md,
              }}
            >
              <TextBody style={{ fontWeight: "700" }}>{a.title}</TextBody>
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  marginTop: space.xs,
                  flexWrap: "wrap",
                }}
              >
                <TextCaption>Your bid </TextCaption>
                <ValueCurrency amount={Number(r.amount)} />
              </View>
              {a.status === "active" ? (
                <View style={{ marginTop: space.sm }}>
                  <Countdown endsAt={a.ends_at} />
                </View>
              ) : (
                <TextCaption style={{ marginTop: space.sm }}>{a.status}</TextCaption>
              )}
              <View style={{ marginTop: space.md, flexDirection: "row", alignItems: "center" }}>
                {leading ? <BadgeLeading /> : <BadgeOutbid />}
              </View>
              <ButtonPrimary
                title="View auction"
                onPress={() => router.push(`/auction/${a.id}`)}
                style={{ marginTop: space.md }}
              />
            </View>
          );
        })
      )}
    </Screen>
  );
}
