import { AuctionDetailHeroGallery } from "@/src/components/ui/AuctionDetailHeroGallery";
import { Badge } from "@/src/components/ui/Badge";
import { BidHistoryCollapsible } from "@/src/components/ui/BidHistoryCollapsible";
import { ButtonPrimary } from "@/src/components/ui/ButtonPrimary";
import { Checkbox } from "@/src/components/ui/Checkbox";
import { Chip } from "@/src/components/ui/Chip";
import { CommunicationCodeCard } from "@/src/components/ui/CommunicationCodeCard";
import { Countdown } from "@/src/components/ui/Countdown";
import { NumericStepper } from "@/src/components/ui/NumericStepper";
import { Screen } from "@/src/components/ui/Screen";
import { SellerCard } from "@/src/components/ui/SellerCard";
import { TextBody } from "@/src/components/ui/TextBody";
import { TextCaption } from "@/src/components/ui/TextCaption";
import { TextTitle } from "@/src/components/ui/TextTitle";
import {
    useAuctionBids,
    useAuctionDetail,
    useCuratedCategories,
    type SellerRatingSummary,
} from "@/src/data/auctions";
import {
    auctionDetailStatusText,
    isAuctionLiveForUi,
} from "@/src/lib/auction-live";
import { formatMoneyAmount } from "@/src/lib/format-money";
import {
    BIDMASTER_WINNER_TERMS_VERSION,
    formatMaldivesPhoneDisplay,
    sellerHighBidderPendingConsentParagraphs,
    sellerPaymentStageParagraphs,
    winnerConsentRequestedParagraphs,
} from "@/src/lib/bidmaster-legal-copy";
import { listingAttributeChips } from "@/src/lib/listing-attributes-display";
import { parseListingAttributesJson } from "@/src/lib/listing-attribute-templates";
import { deliveryOptionLabel } from "@/src/lib/listing-delivery-options";
import { itemConditionLabel } from "@/src/lib/listing-item-condition";
import { LISTING_PAYMENT_AND_FULFILMENT_DISCLAIMER } from "@/src/lib/listing-payment-disclaimer";
import { buildAuctionPublicUrl } from "@/src/lib/site-url";
import { supabase } from "@/src/lib/supabase";
import { useAuth } from "@/src/providers/AuthProvider";
import { layout } from "@/src/theme/layout";
import { accentBorderSubtle, accentWash, colors, fontFamilies, palette, radii, space } from "@/src/theme/tokens";
import { AuctionSeoHead } from "@/src/components/web/AuctionSeoHead";
import { Ionicons } from "@expo/vector-icons";
import { useQueryClient } from "@tanstack/react-query";
import { router, useLocalSearchParams, type Href } from "expo-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Alert, Pressable, StyleSheet, View, useWindowDimensions, Platform } from "react-native";
import Animated, { FadeIn, FadeInDown, useReducedMotion } from "react-native-reanimated";

function formatAuctionEndsDate(iso: string): string {
  try {
    return new Intl.DateTimeFormat(undefined, {
      month: "short",
      day: "numeric",
      year: "numeric",
    }).format(new Date(iso));
  } catch {
    return "";
  }
}

function formatQuickBidChip(n: number): string {
  if (n >= 1000 && n % 1000 === 0) return `${Math.round(n / 1000)}K`;
  return formatMoneyAmount(n);
}

function useAuctionTimeProgress(
  endsAt: string,
  startsAt: string | null | undefined,
  active: boolean,
) {
  const [tick, setTick] = useState(0);
  useEffect(() => {
    if (!active) return;
    const t = setInterval(() => setTick((x) => x + 1), 1000);
    return () => clearInterval(t);
  }, [active, endsAt]);
  return useMemo(() => {
    void tick;
    const end = new Date(endsAt).getTime();
    const start = startsAt ? new Date(startsAt).getTime() : end - 7 * 86400000;
    const now = Date.now();
    const span = Math.max(1, end - start);
    const rem = Math.max(0, end - now);
    const remainingRatio = Math.min(1, rem / span);
    const elapsedPct = Math.min(100, Math.max(0, Math.round((1 - remainingRatio) * 100)));
    const urgentBar = rem / 1000 <= 60 && rem > 0;
    return { remainingRatio, elapsedPct, urgentBar };
  }, [endsAt, startsAt, tick]);
}

function ListingDetailFact({
  label,
  value,
  half,
}: {
  label: string;
  value: string;
  /** Two-column Pinterest-style item details row. */
  half?: boolean;
}) {
  return (
    <View
      style={{
        marginTop: half ? 0 : space.md,
        width: half ? "48%" : "100%",
        flexGrow: half ? 1 : undefined,
        minWidth: half ? 120 : undefined,
      }}
    >
      <TextCaption
        style={{
          fontWeight: "400",
          letterSpacing: 0.8,
          color: colors.textMuted,
          textTransform: "uppercase",
          fontSize: 11,
        }}
      >
        {label}
      </TextCaption>
      <TextBody
        style={{
          marginTop: space.xs,
          fontWeight: "500",
          fontFamily: fontFamilies.body,
          lineHeight: 22,
          color: colors.text,
        }}
      >
        {value}
      </TextBody>
    </View>
  );
}

export default function AuctionDetailScreen() {
  const params = useLocalSearchParams<{ id: string | string[] }>();
  const id =
    typeof params.id === "string"
      ? params.id
      : Array.isArray(params.id)
        ? (params.id[0] ?? "")
        : "";

  const { session, profile } = useAuth();
  const qc = useQueryClient();
  const {
    data: row,
    isPending,
    isError,
    error,
    refetch,
  } = useAuctionDetail(id);
  const { data: curatedCategories } = useCuratedCategories();
  const { data: bids, refetch: refetchBids } = useAuctionBids(id);
  const [bidAmount, setBidAmount] = useState(0);
  const [placingBid, setPlacingBid] = useState(false);
  const [agreeWinnerTerms, setAgreeWinnerTerms] = useState(false);
  const [agreeShareContact, setAgreeShareContact] = useState(false);

  const refetchRef = useRef(refetch);
  const refetchBidsRef = useRef(refetchBids);
  const qcRef = useRef(qc);
  const bidInFlightRef = useRef(false);
  refetchRef.current = refetch;
  refetchBidsRef.current = refetchBids;
  qcRef.current = qc;

  const minNext = useMemo(() => {
    if (!row) return 0;
    const r = row as Record<string, unknown>;
    const cur = r.current_highest_bid as number | null;
    const start = Number(r.starting_price);
    const inc = Number(r.min_bid_increment);
    if (cur == null) return start;
    return Number(cur) + inc;
  }, [row]);

  const step = row
    ? Number((row as Record<string, unknown>).min_bid_increment)
    : 1;

  useEffect(() => {
    if (!Number.isFinite(minNext) || minNext <= 0) return;
    setBidAmount((prev) => {
      if (prev < minNext) return minNext;
      return prev;
    });
  }, [minNext]);

  useEffect(() => {
    if (!id) return;
    // Only depend on `id`: refetch/refetchBids identities change often and would re-run this
    // effect after subscribe(), causing "cannot add postgres_changes callbacks after subscribe()".
    const ch = supabase
      .channel(`auction-${id}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "auctions",
          filter: `id=eq.${id}`,
        },
        () => {
          void refetchRef.current();
          qcRef.current.invalidateQueries({ queryKey: ["auctions"] });
        },
      )
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "bids",
          filter: `auction_id=eq.${id}`,
        },
        () => {
          void refetchRef.current();
          void refetchBidsRef.current();
          qcRef.current.invalidateQueries({ queryKey: ["auctions"] });
        },
      )
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [id]);

  const currentBidForLabel = useMemo(() => {
    if (!row) return 0;
    const r = row as Record<string, unknown>;
    return (
      (r.current_highest_bid as number | null) ?? Number(r.starting_price)
    ) as number;
  }, [row]);

  const bidCountFromRow = useMemo(() => {
    if (!row) return 0;
    return Number((row as Record<string, unknown>).bid_count ?? 0);
  }, [row]);

  const quickBidAmounts = useMemo(() => {
    if (!row) return [] as number[];
    if (!Number.isFinite(minNext) || minNext <= 0) return [];
    const seen = new Set<number>();
    const out: number[] = [];
    for (const mul of [0, 1, 2, 5]) {
      const c = minNext + step * mul;
      if (!Number.isFinite(c) || c <= 0) continue;
      const k = Math.round(c * 100) / 100;
      if (seen.has(k)) continue;
      seen.add(k);
      out.push(k);
    }
    return out.slice(0, 4);
  }, [row, minNext, step]);

  const endsAtForProgress = row ? String((row as Record<string, unknown>).ends_at ?? "") : "";
  const startsAtForProgress =
    (row ? (row as Record<string, unknown>).starts_at : null) as string | null | undefined;
  const statusForProgress = row ? String((row as Record<string, unknown>).status ?? "") : "";
  const liveForProgress =
    Boolean(row && endsAtForProgress) &&
    isAuctionLiveForUi(statusForProgress, endsAtForProgress);
  const timeProgress = useAuctionTimeProgress(
    endsAtForProgress || "2099-12-31T23:59:59.000Z",
    startsAtForProgress ?? null,
    liveForProgress,
  );

  const placeBid = useCallback(async (): Promise<
    | { ok: true }
    | {
        ok: false;
        reason: "not_authenticated" | "suspended" | "rpc" | "rejected";
        message?: string;
        error?: string;
        min_required?: number;
      }
  > => {
    if (!id) return { ok: false, reason: "rejected", message: "Missing auction." };
    if (!session) {
      router.push("/(auth)/login");
      return { ok: false, reason: "not_authenticated" };
    }
    if (profile?.suspended_at) {
      Alert.alert("Suspended", "You cannot bid while suspended.");
      return { ok: false, reason: "suspended" };
    }
    const { data, error: rpcErr } = await supabase.rpc("place_bid", {
      p_auction_id: id,
      p_amount: bidAmount,
    });
    if (rpcErr) {
      return { ok: false, reason: "rpc", message: rpcErr.message };
    }
    const res = data as { ok?: boolean; error?: string; min_required?: number };
    if (!res?.ok) {
      return {
        ok: false,
        reason: "rejected",
        error: res?.error,
        min_required: res.min_required != null ? Number(res.min_required) : undefined,
        message:
          res?.error === "below_min"
            ? `Minimum required: MVR ${formatMoneyAmount(Number(res.min_required ?? 0))}.`
            : (res?.error ?? "Unknown"),
      };
    }
    await refetch();
    await refetchBids();
    qc.invalidateQueries({ queryKey: ["auctions"] });
    qc.invalidateQueries({ queryKey: ["auction", id] });
    return { ok: true };
  }, [bidAmount, id, profile?.suspended_at, qc, refetch, refetchBids, session]);

  const handlePlaceBid = useCallback(async () => {
    if (bidInFlightRef.current) return;
    if (!session) {
      router.push("/(auth)/login");
      return;
    }

    if (!Number.isFinite(bidAmount) || bidAmount <= 0) {
      Alert.alert("Bid", "Enter a valid bid amount.");
      return;
    }

    const matchesKnownBidAmount =
      (bids ?? []).some((b) => Math.abs(b.amount - bidAmount) < 0.005) &&
      bidAmount < minNext - 0.005;

    if (matchesKnownBidAmount) {
      Alert.alert(
        "That bid amount is already taken",
        "Another bidder already used this amount, or it is below the current minimum next bid. Raise your offer or cancel.",
        [
          { text: "Cancel", style: "cancel" },
          { text: "Update bid", onPress: () => setBidAmount(minNext) },
        ],
      );
      return;
    }

    if (bidAmount < minNext) {
      const lead = formatMoneyAmount(currentBidForLabel);
      const need = formatMoneyAmount(minNext);
      const inc = formatMoneyAmount(step);
      const detail =
        bidCountFromRow > 0 && bidAmount <= currentBidForLabel
          ? `That amount matches or is below the current leading bid (MVR ${lead}). Each new bid must be at least MVR ${inc} higher than the leader (seller-set increment).`
          : `Your bid must be at least MVR ${need}.`;
      Alert.alert("Update your bid", detail, [
        { text: "Cancel", style: "cancel" },
        { text: "Use minimum bid", onPress: () => setBidAmount(minNext) },
      ]);
      return;
    }

    bidInFlightRef.current = true;
    setPlacingBid(true);
    try {
      const result = await placeBid();
      if (result.ok) return;

      if (result.reason === "not_authenticated" || result.reason === "suspended") return;

      if (result.reason === "rpc" && result.message) {
        Alert.alert("Bid", result.message);
        return;
      }

      if (result.reason === "rejected" && result.error === "below_min") {
        const minR = result.min_required ?? minNext;
        Alert.alert(
          "Bid not accepted",
          `That price is not valid for the current auction state. The next bid must be at least MVR ${formatMoneyAmount(minR)} (minimum increment MVR ${formatMoneyAmount(step)}).`,
          [
            { text: "Cancel", style: "cancel" },
            { text: "Update bid", onPress: () => setBidAmount(minR) },
          ],
        );
        return;
      }

      if (result.reason === "rejected" && result.message) {
        Alert.alert("Bid not accepted", result.message);
      }
    } finally {
      bidInFlightRef.current = false;
      setPlacingBid(false);
    }
  }, [
    placeBid,
    bidAmount,
    minNext,
    step,
    session,
    bidCountFromRow,
    currentBidForLabel,
    bids,
  ]);

  const bidBannerText = useMemo(() => {
    if (!row || !Number.isFinite(bidAmount) || !Number.isFinite(minNext)) return "";
    const high = currentBidForLabel;
    const proposed = bidAmount;
    if (proposed + 0.0001 < minNext) {
      return `Bid at least MVR ${formatMoneyAmount(minNext)} to continue (current high MVR ${formatMoneyAmount(high)}).`;
    }
    const lift = proposed - high;
    if (Math.abs(lift) < 0.0001) {
      return `You'd match the current high at MVR ${formatMoneyAmount(proposed)} — use the minimum bid to advance.`;
    }
    return `+MVR ${formatMoneyAmount(lift)} over current — you'd be the top bidder at ${formatMoneyAmount(proposed)}.`;
  }, [row, bidAmount, minNext, currentBidForLabel]);

  const winningAmountLabel = useMemo(
    () => `${formatMoneyAmount(Number(currentBidForLabel))} MVR`,
    [currentBidForLabel],
  );

  const giveWinnerConsent = useCallback(async () => {
    if (!id) return;
    if (!agreeWinnerTerms || !agreeShareContact) {
      Alert.alert("Consent", "Please confirm both checkboxes.");
      return;
    }
    const { data, error: rpcErr } = await supabase.rpc("winner_give_consent", {
      p_auction_id: id,
      p_terms_version: BIDMASTER_WINNER_TERMS_VERSION,
    });
    if (rpcErr) {
      Alert.alert("Consent", rpcErr.message);
      return;
    }
    const res = data as { ok?: boolean; error?: string };
    if (!res?.ok) {
      Alert.alert("Consent", res?.error ?? "Could not record consent.");
      return;
    }
    await refetch();
    qc.invalidateQueries({ queryKey: ["won-auctions"] });
    Alert.alert(
      "Thank you",
      "The seller can now contact you using your registered phone.",
    );
  }, [agreeShareContact, agreeWinnerTerms, id, qc, refetch]);

  const structuredListing = useMemo(() => {
    const empty = {
      conditionLabel: "",
      deliveryLabels: [] as string[],
      dimensionsText: null as string | null,
      sizeText: null as string | null,
      weightText: null as string | null,
      colorsText: null as string | null,
      materialsText: null as string | null,
    };
    if (!row) return empty;
    const r = row as Record<string, unknown>;
    const ac = r.auction_categories as
      | { category_id: string; sort_order: number }[]
      | undefined;
    const listingCategoryIds = ac?.length
      ? [...ac].sort((x, y) => x.sort_order - y.sort_order).map((x) => x.category_id)
      : r.category_id
        ? [String(r.category_id)]
        : [];
    const primaryCatId = (r.category_id as string | null) ?? null;
    const attrs = parseListingAttributesJson(r.listing_attributes);
    const chips = listingAttributeChips(
      curatedCategories ?? [],
      primaryCatId,
      listingCategoryIds,
      attrs,
    );
    const deliveryOpts = (r.delivery_options as string[] | null | undefined) ?? [];
    const deliveryLabels = deliveryOpts.map(deliveryOptionLabel).filter(Boolean);
    const conditionLabel = itemConditionLabel(String(r.item_condition ?? ""));

    const dimKeys = new Set(["dim", "w", "h", "d"]);
    const dimensionsText =
      chips
        .filter((c) => dimKeys.has(c.key))
        .map((c) => c.label)
        .join(" · ") || null;
    const sizeChip = chips.find((c) => c.key === "size");
    const rawSize = sizeChip?.label?.trim();
    const sizeText =
      rawSize && /^size\s+/i.test(rawSize)
        ? rawSize.replace(/^size\s+/i, "").trim() || rawSize
        : rawSize || null;
    const weightChip = chips.find((c) => c.key === "wt");
    const weightText = weightChip?.label?.trim() || null;
    const colorsText =
      chips
        .filter((c) => c.key.startsWith("c-"))
        .map((c) => c.label)
        .join(" · ") || null;
    const materialsText =
      chips
        .filter((c) => c.key.startsWith("m-"))
        .map((c) => c.label)
        .join(" · ") || null;

    return {
      conditionLabel,
      deliveryLabels,
      dimensionsText,
      sizeText,
      weightText,
      colorsText,
      materialsText,
    };
  }, [row, curatedCategories]);

  const reducedMotion = useReducedMotion();
  const detailsSheetEntering = useMemo(
    () =>
      reducedMotion
        ? FadeIn.duration(140)
        : FadeInDown.duration(420)
            .delay(70)
            .springify()
            .damping(22)
            .stiffness(280),
    [reducedMotion],
  );
  const { width: winW } = useWindowDimensions();
  const isWide = winW >= layout.breakpoints.md;

  const seoEl = (() => {
    if (Platform.OS !== "web" || !id) return null;
    if (isPending) return <AuctionSeoHead phase="loading" auctionId={id} />;
    if (isError) return <AuctionSeoHead phase="error" auctionId={id} />;
    if (!row) return <AuctionSeoHead phase="missing" auctionId={id} />;
    const r = row as Record<string, unknown>;
    const seoTitle = String(r.title ?? "");
    const seoDescription = String(r.description ?? "");
    const imgs = (r.image_urls as string[] | undefined) ?? [];
    const cur =
      (r.current_highest_bid as number | null) ?? Number(r.starting_price);
    const bidsN = Number(r.bid_count ?? 0);
    const subtitle = `Current bid MVR ${formatMoneyAmount(Number(cur))} · ${bidsN} ${bidsN === 1 ? "bid" : "bids"}`;
    return (
      <AuctionSeoHead
        phase="ready"
        auctionId={id}
        title={seoTitle}
        description={seoDescription}
        imageUrl={imgs[0]}
        subtitle={subtitle}
      />
    );
  })();

  if (!id) {
    return (
      <>
        {seoEl}
        <Screen scroll>
          <TextBody>This auction link is invalid.</TextBody>
        </Screen>
      </>
    );
  }

  if (isPending) {
    return (
      <>
        {seoEl}
        <Screen scroll>
          <TextBody>Loading…</TextBody>
        </Screen>
      </>
    );
  }

  if (isError) {
    return (
      <>
        {seoEl}
        <Screen scroll>
          <TextTitle>Could not load auction</TextTitle>
          <TextBody style={{ marginTop: space.md }}>
            {error instanceof Error ? error.message : "Something went wrong."}
          </TextBody>
        </Screen>
      </>
    );
  }

  if (!row) {
    return (
      <>
        {seoEl}
        <Screen scroll>
          <TextBody>
            This auction was not found or is no longer available.
          </TextBody>
        </Screen>
      </>
    );
  }

  const a = row as Record<string, unknown>;
  const title = String(a.title ?? "");
  const desc = String(a.description ?? "");
  const loc = String(a.location ?? "");
  const status = String(a.status ?? "");
  const endsAt = String(a.ends_at ?? "");
  const startsAt = (a.starts_at as string | null | undefined) ?? null;
  const sellerId = String(a.seller_id ?? "");
  const seller = a.seller as { display_name: string | null } | null;
  const sellerName = seller?.display_name ?? "Seller";
  const categoryLabels = (a.category_names as string[] | undefined) ?? [];
  const primaryCategory = categoryLabels[0];
  const payment = String(a.payment_instructions ?? "");
  const winnerId = (a.winner_id as string | null) ?? null;
  const bidNumber = (a.bid_number as string | null) ?? null;
  const communicationCode = (a.communication_code as string | null) ?? null;
  const sellerPhone = (a.seller_phone as string | null) ?? null;
  const winnerContactPhone = (a.winner_contact_phone as string | null) ?? null;
  const winnerPosition = Number(a.winner_position ?? 1);
  const sellerRatingSummary = a.seller_rating_summary as
    | SellerRatingSummary
    | null
    | undefined;
  const sellerRatingLabel =
    sellerRatingSummary && sellerRatingSummary.count > 0
      ? `${sellerRatingSummary.avg.toFixed(1)} (${sellerRatingSummary.count})`
      : undefined;
  const imageUrls = (a.image_urls as string[] | undefined) ?? [];
  const bidCount = Number(a.bid_count ?? 0);
  const currentBid =
    (a.current_highest_bid as number | null) ?? Number(a.starting_price);
  const liveUi = isAuctionLiveForUi(status, endsAt);
  const listingShareUrl = buildAuctionPublicUrl(id);
  const listingShareMessage = `${title} — MVR ${formatMoneyAmount(currentBid)} current bid · ${bidCount} ${bidCount === 1 ? "bid" : "bids"} on ES Neelan`;

  const sellerPhoneDisplay = formatMaldivesPhoneDisplay(sellerPhone);
  const winnerContactDisplay = formatMaldivesPhoneDisplay(winnerContactPhone);

  const isSeller = session?.user.id === sellerId;
  const isWinner = !!session?.user.id && winnerId === session.user.id;

  return (
    <>
      {seoEl}
      <Screen scroll noPadding style={{ backgroundColor: palette.canvasParchment }}>
      <View
        style={{
          width: "100%",
          maxWidth: layout.maxContentWidth,
          alignSelf: "center",
          flexDirection: isWide ? "row" : "column",
          gap: isWide ? space.xxl : 0,
          paddingHorizontal: space.lg,
          paddingTop: space.md,
          paddingBottom: space.xxl,
          alignItems: isWide ? "flex-start" : "stretch",
        }}
      >
        <View
          style={[
            {
              flex: isWide ? 7 : undefined,
              width: isWide ? undefined : "100%",
              minWidth: 0,
            },
            isWide && Platform.OS === "web"
              ? ({ position: "sticky" as const, top: 24, alignSelf: "flex-start" } as const)
              : null,
          ]}
        >
          <AuctionDetailHeroGallery
            imageUrls={imageUrls}
            shareTitle={`${title} — ES Neelan`}
            shareUrl={listingShareUrl}
            shareMessage={listingShareMessage}
            showLiveBadge={liveUi}
            showClosedBadge={String(status).trim().toLowerCase() === "active" && !liveUi}
          />
        </View>

        <Animated.View
          entering={detailsSheetEntering}
          style={{
            flex: isWide ? 5 : undefined,
            width: isWide ? undefined : "100%",
            minWidth: 0,
            paddingTop: isWide ? 0 : space.lg,
          }}
        >
          {primaryCategory ? (
            <Badge title={primaryCategory} variant="accent" compact />
          ) : null}

          <TextTitle
            style={{
              marginTop: space.sm,
              fontSize: 28,
              lineHeight: 34,
              fontWeight: "700",
              letterSpacing: -1.2,
              fontFamily: fontFamilies.headingSerif,
              color: palette.onSurface,
            }}
          >
            {title}
          </TextTitle>

          <View
            style={{
              marginTop: space.md,
              flexDirection: "row",
              flexWrap: "wrap",
              gap: space.sm,
            }}
          >
            <View
              style={{
                flex: 1,
                minWidth: 140,
                padding: space.lg,
                borderRadius: radii.xl,
                borderWidth: 1,
                borderColor: colors.hairlineSoft,
                backgroundColor: colors.surfaceSoft,
              }}
            >
              <TextCaption
                style={{
                  fontWeight: "600",
                  letterSpacing: 1.2,
                  color: colors.textMuted,
                  textTransform: "uppercase",
                  fontSize: 11,
                }}
              >
                Current bid
              </TextCaption>
              <TextBody
                style={{
                  marginTop: space.xs,
                  fontSize: 22,
                  lineHeight: 28,
                  fontWeight: "600",
                  fontFamily: fontFamilies.bodySemiBold,
                  color: colors.primary,
                  letterSpacing: -0.3,
                }}
                numberOfLines={1}
                adjustsFontSizeToFit
                minimumFontScale={0.65}
              >
                MVR {formatMoneyAmount(currentBid)}
              </TextBody>
              <TextCaption
                style={{ marginTop: space.xs, fontWeight: "400", color: colors.textSecondary }}
              >
                {bidCount} {bidCount === 1 ? "bid" : "bids"} placed
              </TextCaption>
            </View>
            {liveUi ? (
              <View
                style={{
                  flex: 1,
                  minWidth: 140,
                  padding: space.lg,
                  borderRadius: radii.xl,
                  borderWidth: 1,
                  borderColor: colors.hairlineSoft,
                  backgroundColor: colors.surfaceSoft,
                }}
              >
                <Countdown
                  variant="detail"
                  endsAt={endsAt}
                  startsAt={startsAt}
                  showProgressBar={false}
                  headerCompactTime
                  endDateLine={formatAuctionEndsDate(endsAt)}
                />
              </View>
            ) : (
              <View
                style={{
                  flex: 1,
                  minWidth: 140,
                  padding: space.lg,
                  borderRadius: radii.xl,
                  borderWidth: 1,
                  borderColor: colors.hairlineSoft,
                  backgroundColor: colors.surfaceSoft,
                }}
              >
                <TextCaption
                  style={{
                    fontWeight: "400",
                    color: colors.textMuted,
                    textTransform: "uppercase",
                    fontSize: 10,
                  }}
                >
                  STATUS
                </TextCaption>
                <TextBody
                  style={{
                    marginTop: space.xs,
                    fontWeight: "400",
                    fontFamily: fontFamilies.body,
                  }}
                >
                  {auctionDetailStatusText(status, endsAt)}
                </TextBody>
              </View>
            )}
          </View>

          {liveUi ? (
            <>
              <View
                style={{
                  marginTop: space.md,
                  height: 6,
                  borderRadius: radii.pill,
                  backgroundColor: colors.secondaryContainer,
                  overflow: "hidden",
                }}
              >
                <View
                  style={{
                    height: "100%",
                    width: `${timeProgress.elapsedPct}%`,
                    backgroundColor: timeProgress.urgentBar ? colors.danger : colors.primary,
                    borderRadius: radii.pill,
                  }}
                />
              </View>
              <TextCaption
                style={{
                  marginTop: space.xs,
                  textAlign: "right",
                  color: colors.textMuted,
                  fontSize: 12,
                }}
              >
                {timeProgress.elapsedPct}% of auction time elapsed
              </TextCaption>
            </>
          ) : null}

          {isSeller &&
          bidNumber &&
          [
            "active",
            "awaiting_winner_consent",
            "payment_stage",
            "won",
            "paid",
            "completed",
          ].includes(status) ? (
            <View style={{ marginTop: space.lg }}>
              <CommunicationCodeCard
                bidNumber={bidNumber}
                communicationCode={communicationCode}
              />
            </View>
          ) : null}

          {isSeller && status === "awaiting_winner_consent" ? (
            <View
              style={{
                marginTop: space.lg,
                padding: space.md,
                backgroundColor: colors.surfaceMuted,
                borderRadius: radii.md,
              }}
            >
          <TextCaption style={{ fontWeight: "500" }}>
                Awaiting winner consent
              </TextCaption>
              {sellerHighBidderPendingConsentParagraphs({
                itemName: title,
                bidNumber: bidNumber,
                winningAmountLabel,
              }).map((para, i) => (
                <TextBody
                  key={`sv-pend-${i}`}
                  style={{
                    marginTop: i === 0 ? space.sm : space.xs,
                    color: colors.textSecondary,
                  }}
                >
                  {para}
                </TextBody>
              ))}
            </View>
          ) : null}

          {isSeller && status === "payment_stage" ? (
            <View style={{ marginTop: space.lg, gap: space.sm }}>
              <TextTitle style={{ fontSize: 18 }}>Winner contact</TextTitle>
              <TextBody>
                Phone:{" "}
                <TextBody style={{ fontWeight: "600" }}>
                  {winnerContactPhone ? winnerContactDisplay : "—"}
                </TextBody>
              </TextBody>
              <TextCaption>Position: {winnerPosition}</TextCaption>
              <ButtonPrimary
                title="Submit closure form"
                onPress={() => router.push(`/auction/closure/${id}` as Href)}
              />
              <View
                style={{
                  marginTop: space.md,
                  paddingTop: space.md,
                  borderTopWidth: 1,
                  borderTopColor: colors.border,
                }}
              >
                {sellerPaymentStageParagraphs({
                  itemName: title,
                  bidNumber: bidNumber ?? "—",
                  winningAmountLabel,
                  position: winnerPosition,
                  winnerPhoneDisplay: winnerContactDisplay,
                }).map((para, i) => (
                  <TextBody
                    key={`pay-stage-${i}`}
                    style={{
                      marginTop: i === 0 ? 0 : space.sm,
                      color: colors.textSecondary,
                    }}
                  >
                    {para}
                  </TextBody>
                ))}
              </View>
            </View>
          ) : null}

          {isWinner && status === "awaiting_winner_consent" ? (
            <View style={{ marginTop: space.lg, gap: space.md }}>
              <TextTitle style={{ fontSize: 20 }}>
                You won this auction
              </TextTitle>
              {winnerConsentRequestedParagraphs({
                itemName: title,
                bidNumber: bidNumber ?? "—",
                winningAmountLabel,
                sellerPhoneDisplay,
                communicationCode: communicationCode ?? "—",
                position: winnerPosition,
              }).map((para, i) => (
                <TextBody
                  key={`win-consent-${i}`}
                  style={{
                    marginTop: i === 0 ? space.sm : space.xs,
                    color: colors.textSecondary,
                  }}
                >
                  {para}
                </TextBody>
              ))}
              <Checkbox
                checked={agreeWinnerTerms}
                onToggle={() => setAgreeWinnerTerms((v) => !v)}
                label="I agree to the platform terms."
              />
              <Checkbox
                checked={agreeShareContact}
                onToggle={() => setAgreeShareContact((v) => !v)}
                label="I consent to share my contact information with the seller."
              />
              <ButtonPrimary
                title="Give consent"
                onPress={() => void giveWinnerConsent()}
                disabled={!agreeWinnerTerms || !agreeShareContact}
              />
            </View>
          ) : null}

          {liveUi && !isSeller && session ? (
            <View
              style={{
                marginTop: space.lg,
                paddingTop: space.lg,
                borderTopWidth: StyleSheet.hairlineWidth,
                borderTopColor: colors.border,
              }}
            >
              <NumericStepper
                filledAmountField
                disabled={placingBid}
                value={bidAmount}
                min={minNext}
                step={step}
                onChange={setBidAmount}
                label="Your bid (MVR)"
                format={formatMoneyAmount}
              />

              {quickBidAmounts.length > 0 ? (
                <View
                  style={{
                    marginTop: space.md,
                    flexDirection: "row",
                    flexWrap: "wrap",
                    gap: space.sm,
                  }}
                >
                  {quickBidAmounts.map((amt) => (
                    <Chip
                      key={`qb-${amt}`}
                      title={formatQuickBidChip(amt)}
                      appearance="outlined"
                      compact
                      disabled={placingBid}
                      onPress={() => setBidAmount(amt)}
                    />
                  ))}
                </View>
              ) : null}

              {bidBannerText ? (
                <View
                  style={{
                    marginTop: space.md,
                    flexDirection: "row",
                    alignItems: "flex-start",
                    gap: space.sm,
                    padding: space.md,
                    borderRadius: radii.sm,
                    backgroundColor: accentWash,
                    borderWidth: 1,
                    borderColor: accentBorderSubtle,
                  }}
                >
                  <Ionicons
                    name="information-circle-outline"
                    size={20}
                    color={colors.primary}
                    style={{ marginTop: 1 }}
                  />
                  <TextCaption
                    style={{ flex: 1, color: colors.textSecondary, lineHeight: 20, fontWeight: "400" }}
                  >
                    {bidBannerText}
                  </TextCaption>
                </View>
              ) : null}

              <ButtonPrimary
                title={`Place bid — MVR ${formatMoneyAmount(bidAmount)}`}
                icon="hammer"
                loading={placingBid}
                onPress={() => void handlePlaceBid()}
                style={{ marginTop: space.md, borderRadius: radii.pill, alignSelf: "stretch" }}
              />
            </View>
          ) : null}

          {liveUi && !session ? (
            <View style={{ marginTop: space.xl }}>
              <ButtonPrimary
                title="LOG IN TO BID"
                onPress={() => router.push("/(auth)/login")}
              />
            </View>
          ) : null}

          {isSeller ? (
            <TextCaption style={{ marginTop: space.lg, fontWeight: "400", color: colors.textSecondary }}>
              This is your listing.
            </TextCaption>
          ) : null}

      <View style={{ marginTop: space.xxl }}>
        {(() => {
          const sl = structuredListing;
          const hasLoc = loc.trim().length > 0;
          const hasFacts =
            !!sl.conditionLabel?.trim() ||
            sl.dimensionsText ||
            sl.sizeText ||
            sl.weightText ||
            sl.colorsText ||
            sl.materialsText ||
            sl.deliveryLabels.length > 0 ||
            hasLoc;
          const hasDesc = desc.trim().length > 0;
          if (!hasFacts && !hasDesc) return null;
          return (
            <>
              <TextTitle
                style={{
                  fontSize: 22,
                  lineHeight: 28,
                  fontWeight: "600",
                  fontFamily: fontFamilies.headingSerif,
                  letterSpacing: -0.5,
                  color: palette.onSurface,
                  marginBottom: space.lg,
                }}
              >
                Item details
              </TextTitle>
              <View
                style={{
                  flexDirection: "row",
                  flexWrap: "wrap",
                  columnGap: space.md,
                  rowGap: space.xl,
                }}
              >
                {sl.conditionLabel?.trim() ? (
                  <ListingDetailFact half label="Condition" value={sl.conditionLabel.trim()} />
                ) : null}
                {sl.dimensionsText ? (
                  <ListingDetailFact half label="Dimensions" value={sl.dimensionsText} />
                ) : null}
                {sl.sizeText ? <ListingDetailFact half label="Size" value={sl.sizeText} /> : null}
                {sl.weightText ? <ListingDetailFact half label="Weight" value={sl.weightText} /> : null}
                {sl.colorsText ? <ListingDetailFact half label="Colours" value={sl.colorsText} /> : null}
                {sl.materialsText ? (
                  <ListingDetailFact half label="Materials" value={sl.materialsText} />
                ) : null}
                {sl.deliveryLabels.length > 0 || loc.trim().length > 0 ? (
                  <View style={{ width: "48%", flexGrow: 1, minWidth: 120 }}>
                    <TextCaption
                      style={{
                        fontWeight: "400",
                        letterSpacing: 0.8,
                        color: colors.textMuted,
                        textTransform: "uppercase",
                        fontSize: 11,
                      }}
                    >
                      Delivery
                    </TextCaption>
                    {sl.deliveryLabels.length > 0 ? (
                      <TextBody
                        style={{
                          marginTop: space.xs,
                          fontWeight: "500",
                          fontFamily: fontFamilies.body,
                          lineHeight: 22,
                          color: colors.text,
                        }}
                      >
                        {sl.deliveryLabels.join(" · ")}
                      </TextBody>
                    ) : null}
                    {loc.trim().length > 0 ? (
                      <View
                        style={{
                          marginTop: space.sm,
                          flexDirection: "row",
                          alignItems: "center",
                          alignSelf: "flex-start",
                          gap: 4,
                          paddingHorizontal: space.sm,
                          paddingVertical: space.xs,
                          borderRadius: radii.pill,
                          backgroundColor: colors.surfaceCard,
                          borderWidth: 1,
                          borderColor: colors.hairlineSoft,
                        }}
                      >
                        <Ionicons name="location-outline" size={14} color={colors.primary} />
                        <TextCaption style={{ fontWeight: "400", color: colors.textSecondary, fontSize: 12 }}>
                          {loc.trim()}
                        </TextCaption>
                      </View>
                    ) : null}
                  </View>
                ) : null}
              </View>
              {hasDesc ? (
                <>
                  <TextCaption
                    style={{
                      marginTop: space.lg,
                      fontWeight: "400",
                      color: colors.textMuted,
                    }}
                  >
                    Description
                  </TextCaption>
                  <TextBody style={{ marginTop: space.xs }}>{desc.trim()}</TextBody>
                </>
              ) : null}
            </>
          );
        })()}

        </View>

        <View style={{ marginTop: space.xxl }}>
        <BidHistoryCollapsible
          bids={bids ?? []}
          startingPrice={Number(a.starting_price)}
        />
      </View>

        <View style={{ marginTop: space.xxl }}>
        <SellerCard
          displayName={sellerName}
          ratingLabel={sellerRatingLabel}
          avatarUrl={
            (a.seller as { avatar_url?: string | null } | null)?.avatar_url ?? null
          }
          onSellerPress={() => router.push(`/seller/${sellerId}` as Href)}
          onMessagePress={
            isSeller
              ? undefined
              : () =>
                  Alert.alert(
                    "Messages",
                    "Messaging will be available in a future update.",
                  )
          }
        />
      </View>

      {winnerId === session?.user.id &&
      ["won", "paid", "payment_stage"].includes(status) &&
      payment ? (
        <View style={{ marginTop: space.xxl }}>
          <TextTitle>Payment instructions</TextTitle>
          <TextCaption style={{ marginTop: space.sm, color: colors.textSecondary }}>
            ES Neelan does not process this payment. Settle directly with the seller using the
            details below.
          </TextCaption>
          <TextBody style={{ marginTop: space.sm }}>{payment}</TextBody>
        </View>
      ) : null}

      {winnerId === session?.user.id && status === "completed" ? (
        <View style={{ marginTop: space.lg }}>
          <ButtonPrimary
            title="Leave feedback for seller"
            onPress={() => router.push(`/auction/feedback/${id}` as Href)}
          />
        </View>
      ) : null}

      <View
        style={{
          marginTop: space.xl,
          marginBottom: space.lg,
          padding: space.lg,
          backgroundColor: colors.surfaceBlush,
          borderRadius: radii.xl,
          borderWidth: 1,
          borderColor: "rgba(232, 188, 184, 0.25)",
        }}
      >
        <View style={{ flexDirection: "row", alignItems: "flex-start", gap: space.md }}>
          <Ionicons
            name="shield-checkmark-outline"
            size={22}
            color={colors.primary}
            style={{ marginTop: 2 }}
          />
          <View style={{ flex: 1 }}>
          <TextBody style={{ fontWeight: "600", fontSize: 16, color: palette.onSurface }}>
            Payments & delivery
          </TextBody>
        <TextBody style={{ marginTop: space.sm, color: colors.textSecondary, fontWeight: "400" }}>
          {LISTING_PAYMENT_AND_FULFILMENT_DISCLAIMER}
        </TextBody>
        <Pressable
          onPress={() =>
            Alert.alert("Payments & delivery", LISTING_PAYMENT_AND_FULFILMENT_DISCLAIMER)
          }
          style={{ marginTop: space.sm, alignSelf: "flex-start" }}
        >
          <TextCaption
            style={{ fontWeight: "500", textDecorationLine: "underline", letterSpacing: 0.3 }}
          >
            Full wording →
          </TextCaption>
        </Pressable>
          </View>
        </View>
      </View>
      </Animated.View>
      </View>
    </Screen>
    </>
  );
}
