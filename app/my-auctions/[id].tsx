import { useMemo, useState, useCallback, useEffect } from "react";
import { Alert, Image, Pressable, View, useWindowDimensions } from "react-native";
import { useLocalSearchParams, router, useFocusEffect, type Href } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { supabase } from "@/src/lib/supabase";
import { useAuth } from "@/src/providers/AuthProvider";
import { useAuctionDetail, useCuratedCategories } from "@/src/data/auctions";
import {
  useAuctionCollectionIds,
  useInvalidateSellerCollections,
  useMySellerCollections,
} from "@/src/data/seller-collections";
import { AuctionDetailHeroGallery } from "@/src/components/ui/AuctionDetailHeroGallery";
import { Badge } from "@/src/components/ui/Badge";
import { ButtonPrimary } from "@/src/components/ui/ButtonPrimary";
import { ButtonSecondary } from "@/src/components/ui/ButtonSecondary";
import { CommunicationCodeCard } from "@/src/components/ui/CommunicationCodeCard";
import { SellerBuyNowPanel } from "@/src/components/seller/SellerBuyNowPanel";
import { SellerBuyNowSettingsPanel } from "@/src/components/seller/SellerBuyNowSettingsPanel";
import { SellerPostClosePanel } from "@/src/components/seller/SellerPostClosePanel";
import { Countdown } from "@/src/components/ui/Countdown";
import { InfoCallout } from "@/src/components/ui/InfoCallout";
import { Screen } from "@/src/components/ui/Screen";
import { TextBody } from "@/src/components/ui/TextBody";
import { TextCaption } from "@/src/components/ui/TextCaption";
import { TextTitle } from "@/src/components/ui/TextTitle";
import { ValueCurrency } from "@/src/components/ui/ValueCurrency";
import { auctionDetailStatusText, isAuctionLiveForUi } from "@/src/lib/auction-live";
import { auctionStatusLabel } from "@/src/lib/auction-status-label";
import { formatMoneyWithSign } from "@/src/lib/format-money";
import { deliveryOptionLabel } from "@/src/lib/listing-delivery-options";
import { itemConditionLabel } from "@/src/lib/listing-item-condition";
import { listingAttributeChips } from "@/src/lib/listing-attributes-display";
import { parseListingAttributesJson } from "@/src/lib/listing-attribute-templates";
import { APP_DISPLAY_NAME } from "@/src/lib/brand";
import { buildAuctionPublicUrl } from "@/src/lib/site-url";
import { layout } from "@/src/theme/layout";
import {
  accentBorderSubtle,
  colors,
  fontFamilies,
  palette,
  radii,
  space,
} from "@/src/theme/tokens";
import { useQueryClient } from "@tanstack/react-query";

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

function useManageTimeProgress(endsAt: string, startsAt: string | null | undefined, active: boolean) {
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
    return { elapsedPct, urgentBar };
  }, [endsAt, startsAt, tick]);
}

function ManageFact({ label, value, half }: { label: string; value: string; half?: boolean }) {
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

export default function MyAuctionDetailScreen() {
  const params = useLocalSearchParams<{ id: string | string[] }>();
  const id =
    typeof params.id === "string"
      ? params.id
      : Array.isArray(params.id)
        ? params.id[0] ?? ""
        : "";
  const { session } = useAuth();
  const qc = useQueryClient();
  const { data: row, isPending, isError, error, refetch } = useAuctionDetail(id);
  const { data: curatedCategories } = useCuratedCategories();
  const { data: collectionIds = [], refetch: refetchColIds } = useAuctionCollectionIds(id);
  const { data: myCollections = [], refetch: refetchMyCols } = useMySellerCollections();
  const { invalidateCollection, invalidateAll } = useInvalidateSellerCollections();
  const [busyCol, setBusyCol] = useState<string | null>(null);
  const [listingActionBusy, setListingActionBusy] = useState(false);
  const { width: winW } = useWindowDimensions();
  const isWide = winW >= layout.breakpoints.md;

  useFocusEffect(
    useCallback(() => {
      void refetchColIds();
      void refetchMyCols();
    }, [refetchColIds, refetchMyCols]),
  );

  const inCollectionSet = useMemo(() => new Set(collectionIds), [collectionIds]);

  async function toggleCollectionMembership(collectionId: string, currentlyIn: boolean) {
    if (!session?.user.id || !id) return;
    setBusyCol(collectionId);
    try {
      if (currentlyIn) {
        const { error } = await supabase
          .from("seller_collection_items")
          .delete()
          .eq("collection_id", collectionId)
          .eq("auction_id", id);
        if (error) throw error;
      } else {
        const { data: existing, error: ctErr } = await supabase
          .from("seller_collection_items")
          .select("sort_order")
          .eq("collection_id", collectionId)
          .order("sort_order", { ascending: false })
          .limit(1);
        if (ctErr) throw ctErr;
        const maxSort = Number((existing?.[0] as { sort_order?: number } | undefined)?.sort_order ?? 0);
        const { error } = await supabase.from("seller_collection_items").insert({
          collection_id: collectionId,
          auction_id: id,
          sort_order: maxSort + 1,
        });
        if (error) throw error;
      }
      invalidateCollection(collectionId);
      invalidateAll();
      await refetchColIds();
      await refetchMyCols();
    } catch (e: unknown) {
      Alert.alert("Collections", e instanceof Error ? e.message : "Could not update.");
    } finally {
      setBusyCol(null);
    }
  }

  const isMine = useMemo(() => {
    if (!session || !row) return false;
    return String((row as Record<string, unknown>).seller_id ?? "") === session.user.id;
  }, [row, session]);

  const endsAtForProgress = row ? String((row as Record<string, unknown>).ends_at ?? "") : "";
  const startsAtForProgress = row
    ? (((row as Record<string, unknown>).starts_at as string | null | undefined) ?? null)
    : null;
  const statusForProgress = row ? String((row as Record<string, unknown>).status ?? "") : "";
  const liveForProgress =
    Boolean(endsAtForProgress) && isAuctionLiveForUi(statusForProgress, endsAtForProgress);
  const timeProgress = useManageTimeProgress(
    endsAtForProgress || "2099-12-31T23:59:59.000Z",
    startsAtForProgress,
    liveForProgress,
  );

  if (!id) {
    return (
      <Screen scroll>
        <TextBody>Invalid link.</TextBody>
      </Screen>
    );
  }

  if (isError) {
    return (
      <Screen scroll>
        <TextTitle>Could not load</TextTitle>
        <TextBody style={{ marginTop: space.md }}>
          {error instanceof Error ? error.message : "Something went wrong."}
        </TextBody>
      </Screen>
    );
  }

  if (!isPending && !row) {
    return (
      <Screen scroll>
        <TextTitle>Not found</TextTitle>
        <TextBody style={{ marginTop: space.md }}>
          This listing is missing or you do not have access.
        </TextBody>
      </Screen>
    );
  }

  if (isPending) {
    return (
      <Screen scroll>
        <TextBody>Loading…</TextBody>
      </Screen>
    );
  }

  if (!isMine) {
    return (
      <Screen scroll>
        <TextTitle>Not your listing</TextTitle>
        <TextBody style={{ marginTop: space.md }}>You can only manage your own auctions here.</TextBody>
      </Screen>
    );
  }

  const r = row as Record<string, unknown>;
  const title = String(r.title ?? "");
  const status = String(r.status ?? "");
  const desc = String(r.description ?? "");
  const loc = String(r.location ?? "");
  const terms = String(r.terms ?? "");
  const endsAt = String(r.ends_at ?? "");
  const startsAt = (r.starts_at as string | null | undefined) ?? null;
  const imageUrls = (r.image_urls as string[] | undefined) ?? [];
  const bid = (r.current_highest_bid as number | null) ?? Number(r.starting_price);
  const bidCount = Number(r.bid_count ?? 0);
  const bidNumber = (r.bid_number as string | null) ?? null;
  const commCode = (r.communication_code as string | null) ?? null;
  const winnerContactPhone = (r.winner_contact_phone as string | null) ?? null;
  const winnerPosition = Number(r.winner_position ?? 1);
  const winnerConsentRequestedAt =
    ((r.winner_consent_requested_at as string | null) ?? (r.updated_at as string | null)) ?? null;
  const bidType = String(r.bid_type ?? "standard");
  const feePending = Boolean(r.featured_listing_fee_pending);
  const listingFeePaid = Boolean(r.listing_fee_paid);
  const minInc = Number(r.min_bid_increment ?? 0);
  const startingPrice = Number(r.starting_price ?? 0);
  const categoryNames = (r.category_names as string[] | undefined) ?? [];
  const primaryCategory = categoryNames[0];
  const itemCondition = itemConditionLabel(String(r.item_condition ?? ""));
  const deliveryOpts = (r.delivery_options as string[] | null | undefined) ?? [];
  const deliveryLine = deliveryOpts.map(deliveryOptionLabel).filter(Boolean).join(" · ") || "—";
  const ac = r.auction_categories as { category_id: string; sort_order: number }[] | undefined;
  const listingCategoryIds = ac?.length
    ? [...ac].sort((x, y) => x.sort_order - y.sort_order).map((x) => x.category_id)
    : r.category_id
      ? [String(r.category_id)]
      : [];
  const primaryCatId = (r.category_id as string | null) ?? null;
  const attrs = parseListingAttributesJson(r.listing_attributes);
  const attrChips = listingAttributeChips(
    curatedCategories ?? [],
    primaryCatId,
    listingCategoryIds,
    attrs,
  )
    .slice(0, 8)
    .map((c) => c.label);

  const liveUi = endsAt ? isAuctionLiveForUi(status, endsAt) : false;

  const canEditListing = status === "draft";
  const canDeleteDraft = canEditListing && bidCount === 0;
  const canEditInPlace = ["pending_approval", "awaiting_payment", "active", "ended", "cancelled"].includes(status);
  const hideHeroActions = canEditListing;
  const listingShareUrl = buildAuctionPublicUrl(id);
  const listingShareMessage = `${title} — ${formatMoneyWithSign(Number(bid))} current bid · ${bidCount} ${bidCount === 1 ? "bid" : "bids"} on ${APP_DISPLAY_NAME}`;

  async function openFeaturedFeeScreen() {
    const needRequest =
      (status === "draft" && bidType === "standard") ||
      (status === "active" && bidType === "standard" && !feePending);

    if (needRequest) {
      const { data: rpc, error } = await supabase.rpc("seller_request_featured_listing_fee", {
        p_auction_id: id,
      });
      if (error) {
        Alert.alert("Error", error.message);
        return;
      }
      if (rpc && typeof rpc === "object" && "ok" in rpc && rpc.ok === false) {
        Alert.alert("Error", String((rpc as { error?: string }).error));
        return;
      }
      await refetch();
    }
    router.push(`/my-auctions/featured-fee?id=${id}` as Href);
  }

  const showFeaturedFeeCta =
    (status === "draft" && (bidType === "standard" || bidType === "featured")) ||
    (status === "active" && bidType === "standard") ||
    (status === "active" && feePending);

  async function beginEditInPlace() {
    if (!session?.user.id || listingActionBusy) return;
    setListingActionBusy(true);
    try {
      const { data, error } = await supabase.rpc("seller_begin_listing_edit", { p_auction_id: id });
      if (error) throw error;
      const result = data as { ok?: boolean; error?: string };
      if (!result?.ok) throw new Error(result?.error ?? "Could not open this listing for editing.");
      qc.invalidateQueries({ queryKey: ["my-auctions"] });
      qc.invalidateQueries({ queryKey: ["auction", id] });
      router.push(`/create/step1-details?id=${id}` as Href);
    } catch (e: unknown) {
      Alert.alert("Could not edit listing", e instanceof Error ? e.message : "Try again.");
    } finally {
      setListingActionBusy(false);
    }
  }

  function confirmEditInPlace() {
    Alert.alert(
      status === "active" ? "Withdraw live listing to edit?" : "Edit this listing?",
      status === "active"
        ? "The listing will leave the public marketplace while you edit it. Its bid history stays attached. After saving, send it for approval again."
        : "This listing will return to Draft. Edit it, then send it for approval again.",
      [
        { text: "Cancel", style: "cancel" },
        { text: "Continue to edit", onPress: () => void beginEditInPlace() },
      ],
    );
  }

  async function deleteDraft() {
    setListingActionBusy(true);
    try {
      const { data, error } = await supabase.rpc("seller_delete_draft", { p_auction_id: id });
      if (error) throw error;
      const result = data as { ok?: boolean; error?: string; storage_paths?: string[] };
      if (!result?.ok) throw new Error(result?.error ?? "Could not delete draft.");
      if (result.storage_paths?.length) {
        const { data: retained, error: retainedError } = await supabase
          .from("auction_images")
          .select("storage_path")
          .in("storage_path", result.storage_paths);
        if (retainedError) throw retainedError;
        const retainedPaths = new Set((retained ?? []).map((image) => image.storage_path));
        const orphanedPaths = result.storage_paths.filter((path) => !retainedPaths.has(path));
        if (orphanedPaths.length) {
          const { error: storageError } = await supabase.storage.from("auction-images").remove(orphanedPaths);
          if (storageError) console.warn("draft storage cleanup", storageError.message);
        }
      }
      qc.invalidateQueries({ queryKey: ["my-auctions"] });
      router.replace("/my-auctions" as Href);
    } catch (e: unknown) {
      Alert.alert("Could not delete draft", e instanceof Error ? e.message : "Try again.");
    } finally {
      setListingActionBusy(false);
    }
  }

  function confirmDeleteDraft() {
    Alert.alert("Delete this draft?", "The draft and its photos will be permanently deleted.", [
      { text: "Keep draft", style: "cancel" },
      { text: "Delete draft", style: "destructive", onPress: () => void deleteDraft() },
    ]);
  }

  return (
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
          style={{
            flex: isWide ? 7 : undefined,
            width: isWide ? undefined : "100%",
            minWidth: 0,
          }}
        >
          <AuctionDetailHeroGallery
            imageUrls={imageUrls}
            shareTitle={`${title} — ${APP_DISPLAY_NAME}`}
            shareUrl={hideHeroActions ? undefined : listingShareUrl}
            shareMessage={hideHeroActions ? undefined : listingShareMessage}
            showLiveBadge={liveUi}
            showClosedBadge={String(status).trim().toLowerCase() === "active" && !liveUi}
            showListingActions={!hideHeroActions}
          />
        </View>

        <View
          style={{
            flex: isWide ? 5 : undefined,
            width: isWide ? undefined : "100%",
            minWidth: 0,
            paddingTop: isWide ? 0 : space.lg,
          }}
        >
          {canEditListing ? (
            <InfoCallout
              message="Draft — shoppers do not see this listing until you review it and submit it for approval."
            />
          ) : null}

          {canEditListing ? (
            <View
              style={{
                marginTop: space.md,
                padding: space.lg,
                borderRadius: radii.xl,
                borderWidth: 1,
                borderColor: accentBorderSubtle,
                backgroundColor: colors.surfaceSoft,
                gap: space.sm,
              }}
            >
              <TextBody style={{ fontWeight: "700", fontSize: 16 }}>Edit listing</TextBody>
              <TextCaption style={{ color: colors.textSecondary, marginBottom: space.xs }}>
                Photos, title, categories, pricing, schedule, and location — same flow as when you
                first listed.
              </TextCaption>
              <ButtonPrimary
                title="Photos & listing details"
                onPress={() => router.push(`/create/step1-details?id=${id}` as Href)}
              />
              <ButtonSecondary
                title="Platform terms"
                onPress={() => router.push(`/create/step2-terms?id=${id}` as Href)}
              />
              <ButtonSecondary
                title="Listing fee & submit"
                onPress={() => router.push(`/create/step3-payment?id=${id}` as Href)}
              />
              {canDeleteDraft ? (
                <ButtonSecondary
                  title="Delete draft"
                  icon="trash-outline"
                  disabled={listingActionBusy}
                  onPress={confirmDeleteDraft}
                  style={{ borderColor: colors.danger }}
                />
              ) : null}
            </View>
          ) : null}

          {canEditInPlace ? (
            <View
              style={{
                marginTop: space.md,
                padding: space.lg,
                borderRadius: radii.md,
                borderWidth: 1,
                borderColor: colors.border,
                backgroundColor: colors.white,
                gap: space.sm,
              }}
            >
              <TextCaption style={{ letterSpacing: 1, color: colors.textMuted }}>EDIT & RESUBMIT</TextCaption>
              <TextBody style={{ fontWeight: "600", fontSize: 17 }}>Update this listing</TextBody>
              <TextCaption style={{ color: colors.textSecondary }}>
                Keeps the same listing and bid history. It returns to Draft while you edit, then goes through approval again.
              </TextCaption>
              <ButtonPrimary
                title="Edit this listing"
                icon="create-outline"
                loading={listingActionBusy}
                onPress={confirmEditInPlace}
              />
            </View>
          ) : null}

          {primaryCategory ? (
            <Badge title={primaryCategory} variant="accent" compact style={{ marginTop: space.lg }} />
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

          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: space.sm, marginTop: space.sm }}>
            <Badge title={bidType === "featured" ? "FEATURED" : "STANDARD"} variant="accent" compact />
            <TextCaption style={{ fontWeight: "600", alignSelf: "center" }}>
              {auctionStatusLabel(status, endsAt || undefined)}
            </TextCaption>
          </View>

          {status === "active" && feePending ? (
            <TextCaption style={{ marginTop: space.xs, color: colors.textSecondary }}>
              Featured listing fee: payment proof required (your listing stays live).
            </TextCaption>
          ) : null}

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
                {liveUi ? "Current bid" : "Current / starting"}
              </TextCaption>
              <View style={{ marginTop: space.xs }}>
                <ValueCurrency amount={Number(bid)} size="hero" amountFontWeight="600" />
              </View>
              <TextCaption style={{ marginTop: space.xs, color: colors.textSecondary }}>
                {bidCount} {bidCount === 1 ? "bid" : "bids"} · starts {formatMoneyWithSign(startingPrice)}
              </TextCaption>
            </View>
            {liveUi && endsAt ? (
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
                <TextBody style={{ marginTop: space.xs, fontWeight: "400", fontFamily: fontFamilies.body }}>
                  {auctionDetailStatusText(status, endsAt)}
                </TextBody>
              </View>
            )}
          </View>

          {liveUi && endsAt ? (
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
              <TextCaption style={{ marginTop: space.xs, textAlign: "right", color: colors.textMuted }}>
                Time elapsed in this auction window
              </TextCaption>
            </>
          ) : null}

          <View style={{ marginTop: space.lg, flexDirection: "row", flexWrap: "wrap", gap: space.md }}>
            <ManageFact label="Min bid step" value={formatMoneyWithSign(minInc)} half />
            <ManageFact label="Item condition" value={itemCondition || "—"} half />
          </View>
          <ManageFact label="Location / handoff" value={loc.trim() || "—"} />
          <ManageFact label="Delivery" value={deliveryLine} />
          {terms.trim() ? <ManageFact label="Your terms" value={terms.trim()} /> : null}

          {attrChips.length ? (
            <View style={{ marginTop: space.md }}>
              <TextCaption
                style={{
                  fontWeight: "600",
                  letterSpacing: 0.8,
                  color: colors.textMuted,
                  textTransform: "uppercase",
                  fontSize: 11,
                }}
              >
                Listing details
              </TextCaption>
              <TextBody style={{ marginTop: space.xs, lineHeight: 22 }}>{attrChips.join(" · ")}</TextBody>
            </View>
          ) : null}

          {desc ? (
            <TextBody style={{ marginTop: space.lg, lineHeight: 24 }}>{desc}</TextBody>
          ) : null}

          <View
            style={{
              marginTop: space.lg,
              paddingTop: space.lg,
              borderTopWidth: 1,
              borderTopColor: colors.border,
            }}
          >
            <TextBody style={{ fontWeight: "600" }}>Collections (optional)</TextBody>
            <TextCaption style={{ marginTop: space.xs, color: colors.textMuted }}>
              Curated groups on your seller page. This listing can be in more than one collection.
            </TextCaption>
            {myCollections.length === 0 ? (
              <ButtonSecondary
                title="Create a collection"
                onPress={() => router.push("/profile/collections" as Href)}
                style={{ marginTop: space.md }}
              />
            ) : (
              <View style={{ marginTop: space.md, gap: space.sm }}>
                {myCollections.map((c) => {
                  const on = inCollectionSet.has(c.id);
                  const busy = busyCol === c.id;
                  return (
                    <Pressable
                      key={c.id}
                      disabled={busy}
                      onPress={() => void toggleCollectionMembership(c.id, on)}
                      style={({ pressed }) => ({
                        flexDirection: "row",
                        alignItems: "center",
                        gap: space.md,
                        padding: space.md,
                        borderRadius: radii.md,
                        borderWidth: 1,
                        borderColor: on ? colors.primary : colors.border,
                        backgroundColor: pressed ? colors.surfaceMuted : colors.background,
                        opacity: busy ? 0.65 : 1,
                      })}
                    >
                      <View
                        style={{
                          width: 40,
                          height: 40,
                          borderRadius: radii.sm,
                          overflow: "hidden",
                          backgroundColor: colors.surfaceMuted,
                        }}
                      >
                        {c.cover_url ? (
                          <Image source={{ uri: c.cover_url }} style={{ width: 40, height: 40 }} />
                        ) : (
                          <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
                            <Ionicons name="albums-outline" size={20} color={colors.textMuted} />
                          </View>
                        )}
                      </View>
                      <View style={{ flex: 1, minWidth: 0 }}>
                        <TextBody numberOfLines={2} style={{ fontWeight: "500" }}>
                          {c.name}
                        </TextBody>
                      </View>
                      <Ionicons name={on ? "checkmark-circle" : "ellipse-outline"} size={22} color={colors.primary} />
                    </Pressable>
                  );
                })}
              </View>
            )}
          </View>

          {bidNumber || commCode ? (
            <View style={{ marginTop: space.lg }}>
              <CommunicationCodeCard bidNumber={bidNumber} communicationCode={commCode} />
            </View>
          ) : null}

          {status === "awaiting_payment" && bidType === "featured" ? (
            <TextCaption style={{ marginTop: space.lg, color: colors.textSecondary }}>
              Your featured listing fee proof is with admin for verification. You will be notified when it is
              processed.
            </TextCaption>
          ) : null}

          {showFeaturedFeeCta ? (
            <View style={{ marginTop: space.lg, gap: space.sm }}>
              {status === "draft" && bidType === "standard" ? (
                <ButtonPrimary title="Upgrade to featured listing (fee)" onPress={() => void openFeaturedFeeScreen()} />
              ) : null}
              {status === "draft" && bidType === "featured" ? (
                <ButtonPrimary title="Pay featured listing fee" onPress={() => void openFeaturedFeeScreen()} />
              ) : null}
              {status === "active" && bidType === "standard" && !feePending ? (
                <ButtonPrimary title="Request featured listing (fee)" onPress={() => void openFeaturedFeeScreen()} />
              ) : null}
              {status === "active" && feePending ? (
                <>
                  <ButtonPrimary title="Upload listing fee proof" onPress={() => void openFeaturedFeeScreen()} />
                  <ButtonSecondary title="Refresh status" onPress={() => void refetch()} />
                </>
              ) : null}
            </View>
          ) : null}

          {status === "active" && bidType === "featured" && listingFeePaid && !feePending ? (
            <TextCaption style={{ marginTop: space.md, color: colors.textSecondary }}>
              This listing uses the featured tier (listing fee verified).
            </TextCaption>
          ) : null}

          <SellerBuyNowSettingsPanel
            auctionId={id}
            startingPrice={startingPrice}
            currentHighestBid={
              r.current_highest_bid != null ? Number(r.current_highest_bid) : null
            }
            buyNowPrice={
              r.buy_now_price != null && Number(r.buy_now_price) > 0
                ? Number(r.buy_now_price)
                : null
            }
            enabled={liveUi}
            onRefresh={async () => {
              await refetch();
            }}
          />

          <SellerPostClosePanel
            auctionId={id}
            status={status}
            endsAt={endsAt || null}
            title={title}
            bidNumber={bidNumber}
            winnerContactPhone={winnerContactPhone}
            winnerPosition={winnerPosition}
            currentHighestBid={Number(bid)}
            startingPrice={startingPrice}
            winnerConsentRequestedAt={winnerConsentRequestedAt}
            onRefresh={async () => {
              await refetch();
            }}
            onFinalized={async () => {
              qc.invalidateQueries({ queryKey: ["my-auctions"] });
              qc.invalidateQueries({ queryKey: ["auctions"] });
            }}
          />

          <SellerBuyNowPanel
            auctionId={id}
            enabled={liveUi && Number(r.buy_now_price ?? 0) > 0}
            onRefresh={async () => {
              await refetch();
            }}
          />

          <ButtonPrimary
            title="View public listing"
            onPress={() => router.push(`/auction/${id}` as Href)}
            style={{ marginTop: space.xl }}
          />
        </View>
      </View>
    </Screen>
  );
}
