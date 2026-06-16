import { useCallback, useMemo, useState } from "react";
import { Alert, Switch, View } from "react-native";
import { router, useFocusEffect, type Href } from "expo-router";
import { supabase } from "@/src/lib/supabase";
import { useMyAuctions, useMyBids, useWonAuctions } from "@/src/data/user-auctions";
import { useAuth } from "@/src/providers/AuthProvider";
import { Screen } from "@/src/components/ui/Screen";
import { TextTitle } from "@/src/components/ui/TextTitle";
import { TextBody } from "@/src/components/ui/TextBody";
import { TextCaption } from "@/src/components/ui/TextCaption";
import { ButtonPrimary } from "@/src/components/ui/ButtonPrimary";
import { ButtonSecondary } from "@/src/components/ui/ButtonSecondary";
import { InfoCallout } from "@/src/components/ui/InfoCallout";
import { BidManagementListRow } from "@/src/components/ui/BidManagementListRow";
import { space, colors } from "@/src/theme/tokens";
import {
  ActivityUnderlineTabs,
  type ActivityTabKey,
} from "@/src/components/ui/MyActivityWhiteCards";
import { isAuctionLiveForUi } from "@/src/lib/auction-live";
import { formatMoneyAmount } from "@/src/lib/format-money";

type AuctionJoin = {
  id: string;
  title: string;
  description?: string | null;
  status: string;
  ends_at: string;
  current_highest_bid: number | null;
  starting_price: number;
  seller_id: string;
  bid_count?: number | null;
  image_url?: string | null;
} | null;

function fmtMoney(n: number) {
  return formatMoneyAmount(n);
}

function wonStatusPill(status: string): { pill: string; tone: "live" | "muted" | "urgent" } {
  const s = status.toLowerCase();
  if (s === "payment_stage" || s === "awaiting_winner_consent") return { pill: "ACTION", tone: "urgent" };
  if (s === "won") return { pill: "WON", tone: "muted" };
  if (s === "paid" || s === "completed") return { pill: "SETTLED", tone: "live" };
  return { pill: status.replace(/_/g, " ").toUpperCase(), tone: "muted" };
}

export default function BidManagementScreen() {
  const { session } = useAuth();
  const [tab, setTab] = useState<ActivityTabKey>("active");
  const [includeClosedBids, setIncludeClosedBids] = useState(false);
  const [listingsShowClosed, setListingsShowClosed] = useState(false);
  const [listingsShowDrafts, setListingsShowDrafts] = useState(false);

  const { data: rows, refetch: refetchBids } = useMyBids();
  const { data: wonRows, refetch: refetchWon } = useWonAuctions();
  const { data: myListings, refetch: refetchListings } = useMyAuctions();

  useFocusEffect(
    useCallback(() => {
      if (!session) return;
      void refetchBids();
      void refetchWon();
      void refetchListings();
    }, [refetchBids, refetchListings, refetchWon, session]),
  );

  const rowsTyped = rows as
    | {
        id: string;
        amount: number;
        created_at: string;
        auction_id: string;
        auctions: AuctionJoin;
      }[]
    | undefined;

  const bidRows = useMemo(() => {
    const list = rowsTyped ?? [];
    return list.filter((r) => r.auctions);
  }, [rowsTyped]);

  const activeBidRows = useMemo(() => {
    return bidRows.filter((r) => {
      const a = r.auctions!;
      if (includeClosedBids) return true;
      return isAuctionLiveForUi(a.status, a.ends_at);
    });
  }, [bidRows, includeClosedBids]);

  const listingsFiltered = useMemo(() => {
    const raw = (myListings as Record<string, unknown>[]) ?? [];
    return raw.filter((a) => {
      const st = String(a.status ?? "");
      if (!listingsShowDrafts && st === "draft") return false;
      if (!listingsShowClosed) {
        const openLike = new Set([
          "active",
          "pending_approval",
          "awaiting_payment",
          "awaiting_closure",
          "payment_stage",
          "awaiting_winner_consent",
        ]);
        if (!openLike.has(st)) return false;
      }
      return true;
    });
  }, [myListings, listingsShowClosed, listingsShowDrafts]);

  if (!session) {
    return (
      <Screen scroll>
        <TextTitle>Bid management</TextTitle>
        <TextBody style={{ marginTop: space.lg }}>
          Sign in to track bids, wins, and your listings.
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
      <TextCaption style={{ marginBottom: space.md, color: colors.textMuted }}>
        Track live bids, settle wins, and manage listings — use View lot for the public auction page.
      </TextCaption>

      <ActivityUnderlineTabs tab={tab} onChange={setTab} />

      {tab === "active" ? (
        <>
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
              marginBottom: space.md,
              paddingVertical: space.sm,
              paddingHorizontal: space.md,
              borderRadius: 12,
              borderWidth: 1,
              borderColor: colors.border,
              backgroundColor: colors.surfaceMuted,
            }}
          >
            <View style={{ flex: 1, paddingRight: space.md }}>
              <TextCaption style={{ fontWeight: "600", color: colors.text }}>Include closed lots</TextCaption>
              <TextCaption style={{ marginTop: 4, color: colors.textMuted }}>
                Show bids on ended auctions (outbid, reserve, or closed).
              </TextCaption>
            </View>
            <Switch
              value={includeClosedBids}
              onValueChange={setIncludeClosedBids}
              trackColor={{ false: colors.border, true: colors.accentTint }}
              thumbColor={includeClosedBids ? colors.accent : colors.textMuted}
            />
          </View>
          <InfoCallout message="Use Ends in on the lot page for countdowns. Current bid labels follow the live floor — place bids from View lot." />
          {activeBidRows.length === 0 ? (
            <TextCaption style={{ marginTop: space.sm }}>No bids match this filter.</TextCaption>
          ) : (
            <View style={{ gap: space.md, marginTop: space.md }}>
              {activeBidRows.map((r) => {
                const a = r.auctions!;
                const live = isAuctionLiveForUi(a.status, a.ends_at);
                const leading =
                  a.current_highest_bid != null &&
                  Number(a.current_highest_bid) === Number(r.amount);
                const current = Number(a.current_highest_bid ?? a.starting_price);
                const bids = Number(a.bid_count ?? 0);
                const placed = new Date(r.created_at).toLocaleString(undefined, {
                  dateStyle: "medium",
                  timeStyle: "short",
                });
                const pill = live ? "Live" : "Closed";
                const tone = live ? "live" : "muted";
                const currentLabel = live ? "Current bid" : "Sold";
                return (
                  <BidManagementListRow
                    key={r.id}
                    imageUrl={a.image_url}
                    title={a.title}
                    statusPill={pill}
                    statusPillTone={tone}
                    metaLines={[
                      { label: currentLabel, value: `${fmtMoney(current)} MVR`, emphasize: true },
                      {
                        label: "Total bids",
                        value: `${bids} ${bids === 1 ? "bid" : "bids"}`,
                      },
                      { label: "Your bid", value: `${fmtMoney(Number(r.amount))} MVR`, emphasize: leading },
                      { label: "Position", value: leading ? "Leading" : "Outbid" },
                      { label: "Placed", value: placed },
                    ]}
                    onViewLot={() => router.push(`/auction/${a.id}`)}
                    viewLotLabel="View lot"
                  />
                );
              })}
            </View>
          )}
        </>
      ) : null}

      {tab === "won" ? (
        <>
          <InfoCallout message="Pay the seller using their instructions. Open Pay & settle for winner flow, proof uploads, and communication code when the floor requires it." />
          {(wonRows ?? []).length === 0 ? (
            <TextCaption style={{ marginTop: space.sm }}>No won auctions yet.</TextCaption>
          ) : (
            <View style={{ gap: space.md, marginTop: space.md }}>
              {(wonRows as Record<string, unknown>[]).map((w) => {
                const id = String(w.id);
                const title = String(w.title ?? "");
                const status = String(w.status ?? "");
                const payment = String(w.payment_instructions ?? "");
                const high = Number(w.current_highest_bid ?? 0);
                const img = w.image_url as string | null | undefined;
                const { pill, tone } = wonStatusPill(status);
                const paySnippet =
                  payment.trim().length > 90 ? `${payment.trim().slice(0, 90)}…` : payment.trim();
                return (
                  <BidManagementListRow
                    key={id}
                    imageUrl={img}
                    title={title}
                    statusPill={pill}
                    statusPillTone={tone}
                    metaLines={[
                      { label: "Winning bid", value: `${fmtMoney(high)} MVR`, emphasize: true },
                      ...(paySnippet ? [{ label: "Payment", value: paySnippet }] : []),
                    ]}
                    onViewLot={() => router.push(`/auction/${id}` as Href)}
                    primaryAction={{
                      label: "Pay & settle",
                      onPress: () => router.push(`/won/${id}` as Href),
                    }}
                  />
                );
              })}
            </View>
          )}
        </>
      ) : null}

      {tab === "listings" ? (
        <>
          <View
            style={{
              marginBottom: space.md,
              padding: space.md,
              borderRadius: 12,
              borderWidth: 1,
              borderColor: colors.border,
              backgroundColor: colors.surfaceMuted,
              gap: space.md,
            }}
          >
            <TextCaption style={{ fontWeight: "600", color: colors.text }}>LIST SETTINGS</TextCaption>
            <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
              <View style={{ flex: 1, paddingRight: space.md }}>
                <TextCaption style={{ fontWeight: "600", color: colors.text }}>Show sold & closed</TextCaption>
                <TextCaption style={{ marginTop: 4, color: colors.textMuted }}>
                  Won, completed, and archived listings.
                </TextCaption>
              </View>
              <Switch
                value={listingsShowClosed}
                onValueChange={setListingsShowClosed}
                trackColor={{ false: colors.border, true: colors.accentTint }}
                thumbColor={listingsShowClosed ? colors.accent : colors.textMuted}
              />
            </View>
            <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
              <View style={{ flex: 1, paddingRight: space.md }}>
                <TextCaption style={{ fontWeight: "600", color: colors.text }}>Show drafts</TextCaption>
                <TextCaption style={{ marginTop: 4, color: colors.textMuted }}>
                  Unpublished listings still in progress.
                </TextCaption>
              </View>
              <Switch
                value={listingsShowDrafts}
                onValueChange={setListingsShowDrafts}
                trackColor={{ false: colors.border, true: colors.accentTint }}
                thumbColor={listingsShowDrafts ? colors.accent : colors.textMuted}
              />
            </View>
          </View>
          <InfoCallout message="Featured lots may require listing fee proof. After close, share winner contact only through the guided consent flow on Manage listing." />
          {listingsFiltered.length === 0 ? (
            <TextCaption style={{ marginTop: space.sm }}>No listings match these settings.</TextCaption>
          ) : (
            <View style={{ gap: space.md, marginTop: space.md }}>
              {listingsFiltered.map((a) => {
                const id = String(a.id);
                const title = String(a.title ?? "");
                const status = String(a.status ?? "");
                const img = a.image_url as string | null | undefined;
                const current = Number(a.current_highest_bid ?? a.starting_price ?? 0);
                const bids = Number(a.bid_count ?? 0);
                const endsAtRaw = a.ends_at;
                const endsAt =
                  endsAtRaw != null && String(endsAtRaw).trim() !== "" ? String(endsAtRaw) : null;
                const live = isAuctionLiveForUi(status, endsAt);
                const winnerId = a.winner_id != null ? String(a.winner_id) : "";
                const pill = live
                  ? "Live"
                  : String(status).toLowerCase() === "active"
                    ? "Closed"
                    : listingPillFromStatus(status);
                const tone = live ? "live" : "muted";
                const currentLabel = live ? "Current bid" : "Sold";
                return (
                  <View key={id} style={{ gap: space.sm }}>
                    <BidManagementListRow
                      imageUrl={img}
                      title={title}
                      statusPill={pill}
                      statusPillTone={tone}
                      metaLines={[
                        { label: currentLabel, value: `${fmtMoney(current)} MVR`, emphasize: true },
                        {
                          label: "Total bids",
                          value: `${bids} ${bids === 1 ? "bid" : "bids"}`,
                        },
                        ...(winnerId
                          ? [{ label: "Winner", value: "Assigned — open manage", emphasize: true as const }]
                          : []),
                      ]}
                      onViewLot={() => router.push(`/auction/${id}` as Href)}
                      primaryAction={{
                        label: "Manage listing",
                        onPress: () => router.push(`/my-auctions/${id}` as Href),
                      }}
                    />
                    {status === "won" ? (
                      <ButtonSecondary
                        title="Mark buyer paid"
                        onPress={async () => {
                          const { data: rpc, error } = await supabase.rpc("seller_mark_auction_paid", {
                            p_auction_id: id,
                          });
                          if (error) Alert.alert("Error", error.message);
                          else if (rpc && typeof rpc === "object" && "ok" in rpc && rpc.ok === false) {
                            Alert.alert("Error", String((rpc as { error?: string }).error));
                          } else {
                            void refetchListings();
                          }
                        }}
                      />
                    ) : null}
                  </View>
                );
              })}
            </View>
          )}
        </>
      ) : null}
    </Screen>
  );
}

function listingPillFromStatus(status: string): string {
  const s = status.toLowerCase();
  if (s === "won") return "WON";
  if (s === "paid" || s === "completed") return "DONE";
  if (s === "pending_approval") return "REVIEW";
  if (s === "draft") return "DRAFT";
  return "LISTING";
}
