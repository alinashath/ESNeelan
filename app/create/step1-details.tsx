import { ButtonPrimary } from "@/src/components/ui/ButtonPrimary";
import { ButtonSecondary } from "@/src/components/ui/ButtonSecondary";
import { Chip } from "@/src/components/ui/Chip";
import { DateTimeField } from "@/src/components/ui/DateTimeField";
import { InfoCallout } from "@/src/components/ui/InfoCallout";
import { ListingStructuredFields } from "@/src/components/ui/ListingStructuredFields";
import { NumericStepper } from "@/src/components/ui/NumericStepper";
import { Screen } from "@/src/components/ui/Screen";
import { SearchableMultiCategoryPicker } from "@/src/components/ui/SearchableMultiCategoryPicker";
import { TextArea } from "@/src/components/ui/TextArea";
import { TextBody } from "@/src/components/ui/TextBody";
import { TextField } from "@/src/components/ui/TextField";
import { TextTitle } from "@/src/components/ui/TextTitle";
import { TextLabel } from "@/src/components/ui/TextLabel";
import { TextCaption } from "@/src/components/ui/TextCaption";
import { useCuratedCategories } from "@/src/data/auctions";
import {
  parseListingAttributesJson,
  pruneListingAttributes,
  resolveListingFieldTemplate,
  type ListingAttributesV1,
} from "@/src/lib/listing-attribute-templates";
import {
  DELIVERY_OPTIONS,
  type DeliveryOptionId,
  isDeliveryOptionId,
} from "@/src/lib/listing-delivery-options";
import {
  ITEM_CONDITION_OPTIONS,
  type ItemConditionId,
  isItemConditionId,
} from "@/src/lib/listing-item-condition";
import {
  LISTING_PAYMENT_AND_FULFILMENT_DISCLAIMER,
  LISTING_PAYMENT_INSTRUCTIONS_CAPTION,
} from "@/src/lib/listing-payment-disclaimer";
import { storagePublicUrl } from "@/src/lib/storage-url";
import { supabase } from "@/src/lib/supabase";
import { useAuth } from "@/src/providers/AuthProvider";
import { colors, radii, space } from "@/src/theme/tokens";
import * as ImagePicker from "expo-image-picker";
import { router, useLocalSearchParams, type Href } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import { Alert, Image, Pressable, ScrollView, TextInput, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { StepIndicator } from "@/src/components/ui/StepIndicator";
import { WizardSegmentedProgress } from "@/src/components/ui/WizardSegmentedProgress";

type Picked = { key: string; uri: string; mime?: string };

type SavedDraftImage = { id: string; storage_path: string; publicUrl: string };

const PRICE_JUMPS = [1, 10, 100, 500] as const;
const INC_STEPS = [1, 5, 10, 100, 500, 1000] as const;

const CREATE_SUBSTEP_LABELS = ["Photos", "About", "Location", "Bidding", "Finish"] as const;

type BidTypeUi = "standard" | "featured";

export default function CreateAuctionStep1Details() {
  const params = useLocalSearchParams<{ id?: string | string[] }>();
  const draftIdFromRoute =
    typeof params.id === "string" ? params.id : Array.isArray(params.id) ? (params.id[0] ?? "") : "";

  const { session, profile } = useAuth();
  const { data: curatedCategories } = useCuratedCategories();

  const [auctionName, setAuctionName] = useState("");
  const [description, setDescription] = useState("");
  const [location, setLocation] = useState("");
  const [terms, setTerms] = useState("");
  const [paymentInstructions, setPaymentInstructions] = useState("");
  const [selectedCategoryIds, setSelectedCategoryIds] = useState<string[]>([]);
  const [itemCondition, setItemCondition] = useState<ItemConditionId>("new");
  const [deliveryOptions, setDeliveryOptions] = useState<DeliveryOptionId[]>([]);
  const [listingAttributes, setListingAttributes] = useState<ListingAttributesV1>({});
  const [startingPrice, setStartingPrice] = useState("10");
  const [priceJump, setPriceJump] = useState<number>(10);
  const [minInc, setMinInc] = useState(5);
  const [incStep, setIncStep] = useState<number>(1);
  const [startsAt, setStartsAt] = useState(new Date());
  const [endsAt, setEndsAt] = useState(
    () => new Date(Date.now() + 25 * 3600 * 1000),
  );
  const [photos, setPhotos] = useState<Picked[]>([]);
  const [loading, setLoading] = useState(false);
  const [bidType, setBidType] = useState<BidTypeUi>("standard");
  const [existingImages, setExistingImages] = useState<SavedDraftImage[]>([]);
  const [removingImageId, setRemovingImageId] = useState<string | null>(null);
  const [subStep, setSubStep] = useState(0);

  const lastCreateSubstep = CREATE_SUBSTEP_LABELS.length - 1;

  const subStepTitles = useMemo(
    () =>
      [
        "Add photos",
        "Describe your item",
        "Location and sale terms",
        "Price and schedule",
        "Listing type and payment",
      ] as const,
    [],
  );

  const subStepHints = useMemo(
    () =>
      [
        "",
        "",
        "",
        "Choose a starting price, bid steps, and keep the auction open at least 24 hours.",
        "Standard listings are free to submit. Featured spots include a bank fee on the next screen.",
      ] as const,
    [],
  );

  const curatedList = useMemo(() => curatedCategories ?? [], [curatedCategories]);
  const listingTemplate = useMemo(
    () => resolveListingFieldTemplate(curatedList, selectedCategoryIds),
    [curatedList, selectedCategoryIds],
  );
  const canList =
    !session ||
    profile?.role === "admin" ||
    profile?.seller_verification_status === "approved";
  useEffect(() => {
    if (!draftIdFromRoute || !session?.user.id) return;
    let cancelled = false;
    (async () => {
      const { data: row, error } = await supabase
        .from("auctions")
        .select(
          `
          id, title, description, location, terms, payment_instructions, starting_price, min_bid_increment,
          starts_at, ends_at, status, bid_type, category_id,
          item_condition, delivery_options, listing_attributes,
          auction_categories ( category_id, sort_order ),
          auction_images ( id, storage_path, sort_order )
        `,
        )
        .eq("id", draftIdFromRoute)
        .eq("seller_id", session.user.id)
        .maybeSingle();
      if (error || !row || cancelled) return;
      const r = row as Record<string, unknown>;
      if (String(r.status ?? "") !== "draft") return;
      setAuctionName(String(r.title ?? ""));
      setDescription(String(r.description ?? ""));
      setLocation(String(r.location ?? ""));
      setTerms(String(r.terms ?? ""));
      setPaymentInstructions(String(r.payment_instructions ?? ""));
      const ic = String(r.item_condition ?? "new");
      setItemCondition(isItemConditionId(ic) ? ic : "new");
      const del = r.delivery_options as string[] | null | undefined;
      setDeliveryOptions(
        Array.isArray(del) ? del.filter((x): x is DeliveryOptionId => isDeliveryOptionId(x)) : [],
      );
      setListingAttributes(parseListingAttributesJson(r.listing_attributes));
      setStartingPrice(String(r.starting_price ?? "0"));
      setMinInc(Number(r.min_bid_increment ?? 5));
      if (r.starts_at) setStartsAt(new Date(String(r.starts_at)));
      if (r.ends_at) setEndsAt(new Date(String(r.ends_at)));
      const bt = String(r.bid_type ?? "standard");
      setBidType(bt === "featured" ? "featured" : "standard");
      const ac = r.auction_categories as { category_id: string; sort_order: number }[] | undefined;
      if (ac?.length) {
        setSelectedCategoryIds(
          [...ac].sort((a, b) => a.sort_order - b.sort_order).map((x) => x.category_id),
        );
      } else if (r.category_id) {
        setSelectedCategoryIds([String(r.category_id)]);
      }
      const imgs = r.auction_images as
        | { id: string; storage_path: string; sort_order: number }[]
        | undefined;
      const sorted = [...(imgs ?? [])].sort((a, b) => a.sort_order - b.sort_order);
      setExistingImages(
        sorted.map((img) => ({
          id: img.id,
          storage_path: img.storage_path,
          publicUrl: storagePublicUrl("auction-images", img.storage_path),
        })),
      );
    })();
    return () => {
      cancelled = true;
    };
  }, [draftIdFromRoute, session?.user.id]);

  function removePendingPhotoAt(key: string) {
    setPhotos((prev) => prev.filter((p) => p.key !== key));
  }

  async function removeSavedDraftPhoto(img: SavedDraftImage) {
    if (!session?.user.id) return;
    setRemovingImageId(img.id);
    try {
      const { error: dbErr } = await supabase.from("auction_images").delete().eq("id", img.id);
      if (dbErr) throw dbErr;
      const { error: stErr } = await supabase.storage.from("auction-images").remove([img.storage_path]);
      if (stErr) {
        console.warn("auction-images storage remove:", stErr.message);
      }
      setExistingImages((prev) => prev.filter((x) => x.id !== img.id));
    } catch (e: unknown) {
      Alert.alert("Remove photo", e instanceof Error ? e.message : "Could not remove this photo.");
    } finally {
      setRemovingImageId(null);
    }
  }

  function adjustStarting(delta: number) {
    const n = Number(startingPrice);
    const base = Number.isFinite(n) ? n : 0;
    const next = Math.max(0, Math.round((base + delta) * 100) / 100);
    setStartingPrice(String(next));
  }

  function validatePhotosForWizard() {
    return existingImages.length > 0 || photos.length > 0;
  }

  function validateLocationAndDeliveryForWizard() {
    if (deliveryOptions.length === 0) return false;
    return true;
  }

  function validateAboutForWizard() {
    return Boolean(auctionName.trim()) && selectedCategoryIds.length > 0;
  }

  function validateBiddingForWizard() {
    const sp = Number(startingPrice);
    if (!Number.isFinite(sp) || sp < 0) return false;
    if (endsAt.getTime() - startsAt.getTime() < 24 * 3600 * 1000) return false;
    return true;
  }

  function goNextCreateSubstep() {
    if (subStep === 0) {
      if (!validatePhotosForWizard()) {
        Alert.alert(
          "Add a photo",
          "Include at least one photo of what you are selling. You can add more from your draft later.",
        );
        return;
      }
    } else if (subStep === 1) {
      if (!validateAboutForWizard()) {
        Alert.alert("Title and category", "Enter a listing title and choose at least one category.");
        return;
      }
    } else if (subStep === 2) {
      if (!validateLocationAndDeliveryForWizard()) {
        Alert.alert(
          "Delivery options",
          "Choose at least one delivery option so buyers know how fulfilment works.",
        );
        return;
      }
    } else if (subStep === 3) {
      if (!validateBiddingForWizard()) {
        Alert.alert(
          "Check price and dates",
          "Use a valid starting price (zero or more) and end the auction at least 24 hours after it starts.",
        );
        return;
      }
    }
    setSubStep((s) => Math.min(lastCreateSubstep, s + 1));
  }

  function goPrevCreateSubstep() {
    setSubStep((s) => Math.max(0, s - 1));
  }

  function toggleDelivery(id: DeliveryOptionId) {
    setDeliveryOptions((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  }

  function primaryWizardAction() {
    if (subStep === lastCreateSubstep) {
      void continueToNext();
    } else {
      goNextCreateSubstep();
    }
  }

  async function pickPhotos() {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert("Permission", "Photo library access is required.");
      return;
    }
    const res = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsMultipleSelection: true,
      quality: 0.75,
    });
    if (res.canceled) return;
    setPhotos((prev) => [
      ...prev,
      ...res.assets.map((a, idx) => ({
        key: `pick-${Date.now()}-${idx}-${Math.random().toString(36).slice(2, 9)}`,
        uri: a.uri,
        mime: a.mimeType ?? "image/jpeg",
      })),
    ]);
  }

  async function continueToNext() {
    if (!session) {
      router.push("/(auth)/login");
      return;
    }
    if (profile?.suspended_at) {
      Alert.alert("Suspended", "Your account cannot create listings.");
      return;
    }
    if (
      profile?.role !== "admin" &&
      profile?.seller_verification_status !== "approved"
    ) {
      Alert.alert(
        "Seller verification required",
        "Apply to sell from your Profile and wait for admin approval before submitting a listing.",
      );
      return;
    }
    const sp = Number(startingPrice);
    if (!auctionName.trim() || !selectedCategoryIds.length || !Number.isFinite(sp) || sp < 0) {
      Alert.alert(
        "Check fields",
        "Auction name, at least one category, and a valid starting price are required.",
      );
      return;
    }
    if (existingImages.length === 0 && photos.length === 0) {
      Alert.alert("Photos", "Add at least one item photo.");
      return;
    }
    const minMs = 24 * 3600 * 1000;
    if (endsAt.getTime() - startsAt.getTime() < minMs) {
      Alert.alert("Duration", "Auction must run at least 24 hours.");
      return;
    }
    if (deliveryOptions.length === 0) {
      Alert.alert(
        "Delivery options",
        "Go back to the Location step and choose at least one delivery option.",
      );
      return;
    }
    setLoading(true);
    try {
      const primaryCategoryId = selectedCategoryIds[0];
      let auctionId = draftIdFromRoute;
      const attrsToSave = pruneListingAttributes(listingAttributes, listingTemplate);

      const payload = {
        title: auctionName.trim(),
        description: description.trim(),
        location: location.trim(),
        terms: terms.trim(),
        category_id: primaryCategoryId,
        starting_price: sp,
        min_bid_increment: minInc,
        starts_at: startsAt.toISOString(),
        ends_at: endsAt.toISOString(),
        status: "draft" as const,
        payment_instructions: paymentInstructions.trim() || null,
        bid_type: bidType,
        item_condition: itemCondition,
        delivery_options: deliveryOptions.filter(isDeliveryOptionId),
        listing_attributes: attrsToSave,
      };

      if (auctionId) {
        const { error: upErr } = await supabase
          .from("auctions")
          .update(payload)
          .eq("id", auctionId)
          .eq("seller_id", session.user.id)
          .eq("status", "draft");
        if (upErr) throw upErr;
      } else {
        const { data: ins, error: insErr } = await supabase
          .from("auctions")
          .insert({
            seller_id: session.user.id,
            ...payload,
          })
          .select("id")
          .single();
        if (insErr) throw insErr;
        auctionId = ins.id as string;
      }

      const linkRows = selectedCategoryIds.map((category_id, sort_order) => ({
        auction_id: auctionId,
        category_id,
        sort_order,
      }));
      const { error: delErr } = await supabase
        .from("auction_categories")
        .delete()
        .eq("auction_id", auctionId);
      if (delErr) throw delErr;
      const { error: linkErr } = await supabase.from("auction_categories").insert(linkRows);
      if (linkErr) throw linkErr;

      let order = existingImages.length;
      for (const ph of photos) {
        const path = `${auctionId}/${Date.now()}_${order}.jpg`;
        const res = await fetch(ph.uri);
        if (!res.ok) {
          throw new Error(`Could not read a photo (${res.status}).`);
        }
        const buf = await res.arrayBuffer();
        const body = new Uint8Array(buf);
        const { error: upErr } = await supabase.storage
          .from("auction-images")
          .upload(path, body, {
            contentType: ph.mime ?? "image/jpeg",
            upsert: false,
          });
        if (upErr) throw upErr;
        const { error: imgErr } = await supabase.from("auction_images").insert({
          auction_id: auctionId,
          storage_path: path,
          sort_order: order,
        });
        if (imgErr) throw imgErr;
        order++;
      }

      router.push(`/create/step2-terms?id=${auctionId}` as Href);
    } catch (e: unknown) {
      Alert.alert("Error", e instanceof Error ? e.message : "Could not save");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Screen scroll>
      <StepIndicator currentStep={1} totalSteps={3} labels={["Details", "Terms", "Fee"]} />
      <WizardSegmentedProgress currentIndex={subStep} labels={CREATE_SUBSTEP_LABELS} />
      <TextTitle style={{ marginBottom: space.xs }}>{subStepTitles[subStep]}</TextTitle>
      {subStepHints[subStep] ? (
        <TextBody style={{ marginBottom: space.lg, color: colors.textSecondary }}>
          {subStepHints[subStep]}
        </TextBody>
      ) : null}
      {session && !canList ? (
        <InfoCallout message="Seller verification required. Open Profile, tap Apply to sell, then wait for admin approval before you can submit listings." />
      ) : null}
      {!session ? (
        <TextBody style={{ marginBottom: space.lg }}>
          Sign in to list an item.
        </TextBody>
      ) : null}

      {subStep === 0 ? (
        <View
          style={{
            borderWidth: 2,
            borderStyle: "dashed",
            borderColor: colors.border,
            borderRadius: radii.lg,
            padding: space.lg,
            marginBottom: space.lg,
            backgroundColor: colors.surfaceMuted,
          }}
        >
          <Pressable onPress={pickPhotos} style={{ alignItems: "center", paddingVertical: space.md }}>
            <Ionicons name="camera-outline" size={36} color={colors.textMuted} />
            <TextBody style={{ fontWeight: "600", marginTop: space.sm }}>Add photos</TextBody>
            {existingImages.length > 0 ? (
              <TextCaption style={{ marginTop: space.xs, textAlign: "center", color: colors.textMuted }}>
                {existingImages.length} already saved on this draft.
              </TextCaption>
            ) : null}
          </Pressable>
          {existingImages.length > 0 || photos.length > 0 ? (
            <ScrollView
              horizontal
              style={{ marginTop: space.md }}
              showsHorizontalScrollIndicator={false}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
            >
              {existingImages.map((img) => (
                <View key={img.id} style={{ marginRight: space.sm, position: "relative" }}>
                  <Image
                    source={{ uri: img.publicUrl }}
                    style={{
                      width: 88,
                      height: 88,
                      borderRadius: radii.md,
                      borderWidth: 1,
                      borderColor: colors.border,
                      opacity: removingImageId === img.id ? 0.45 : 1,
                    }}
                  />
                  <Pressable
                    onPress={() => void removeSavedDraftPhoto(img)}
                    disabled={removingImageId === img.id}
                    accessibilityRole="button"
                    accessibilityLabel="Remove saved photo"
                    hitSlop={6}
                    style={{
                      position: "absolute",
                      top: 2,
                      right: 2,
                      width: 28,
                      height: 28,
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <Ionicons name="close-circle" size={26} color={colors.danger} />
                  </Pressable>
                </View>
              ))}
              {photos.map((p) => (
                <View key={p.key} style={{ marginRight: space.sm, position: "relative" }}>
                  <Image
                    source={{ uri: p.uri }}
                    style={{
                      width: 88,
                      height: 88,
                      borderRadius: radii.md,
                      borderWidth: 1,
                      borderColor: colors.border,
                    }}
                  />
                  <Pressable
                    onPress={() => removePendingPhotoAt(p.key)}
                    accessibilityRole="button"
                    accessibilityLabel="Remove photo before saving"
                    hitSlop={6}
                    style={{
                      position: "absolute",
                      top: 2,
                      right: 2,
                      width: 28,
                      height: 28,
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <Ionicons name="close-circle" size={26} color={colors.danger} />
                  </Pressable>
                </View>
              ))}
            </ScrollView>
          ) : null}
        </View>
      ) : null}

      {subStep === 1 ? (
        <View style={{ marginBottom: space.lg }}>
          <TextField
            label="Listing title"
            value={auctionName}
            onChangeText={setAuctionName}
            placeholder="What you are selling"
          />

          {curatedList.length > 0 ? (
            <SearchableMultiCategoryPicker
              label="Categories (up to 5)"
              categories={curatedList}
              selectedIds={selectedCategoryIds}
              onChange={setSelectedCategoryIds}
            />
          ) : (
            <TextBody style={{ marginBottom: space.lg, color: colors.textMuted }}>
              Loading categories… If this persists, run the latest database migrations.
            </TextBody>
          )}

          <TextLabel style={{ marginBottom: space.sm }}>Condition</TextLabel>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: space.sm, marginBottom: space.lg }}>
            {ITEM_CONDITION_OPTIONS.map((opt) => (
              <Chip
                key={opt.id}
                title={opt.label}
                appearance="outlined"
                compact
                selected={itemCondition === opt.id}
                onPress={() => setItemCondition(opt.id)}
              />
            ))}
          </View>

          <ListingStructuredFields
            template={listingTemplate}
            value={listingAttributes}
            onChange={setListingAttributes}
          />

          <TextArea
            label="Additional notes (optional)"
            value={description}
            onChangeText={setDescription}
            placeholder="Story, provenance, or anything that does not fit the tags above."
          />
        </View>
      ) : null}

      {subStep === 2 ? (
        <View style={{ marginBottom: space.lg }}>
          <TextField label="Location" value={location} onChangeText={setLocation} placeholder="Island, area, or pickup note" />
          <TextLabel style={{ marginBottom: space.sm, marginTop: space.md }}>Delivery options</TextLabel>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: space.sm, marginBottom: space.lg }}>
            {DELIVERY_OPTIONS.map((opt) => (
              <Chip
                key={opt.id}
                title={opt.label}
                appearance="outlined"
                selected={deliveryOptions.includes(opt.id)}
                onPress={() => toggleDelivery(opt.id)}
              />
            ))}
          </View>
          <TextArea
            label="Sale terms for this listing (optional)"
            value={terms}
            onChangeText={setTerms}
            placeholder="Anything buyers should agree to for this item only — not the same as platform terms on the next screen."
          />
        </View>
      ) : null}

      {subStep === 3 ? (
        <View style={{ marginBottom: space.lg }}>
          <TextLabel style={{ marginBottom: space.sm }}>Starting price (MVR)</TextLabel>
          <View
            style={{
              borderWidth: 1,
              borderColor: colors.border,
              borderRadius: radii.sm,
              flexDirection: "row",
              alignItems: "center",
              paddingLeft: space.md,
              marginBottom: space.lg,
              backgroundColor: colors.background,
            }}
          >
            <TextBody style={{ fontWeight: "600", color: colors.textMuted, marginRight: space.xs }}>
              MVR
            </TextBody>
            <TextInput
              keyboardType="decimal-pad"
              value={startingPrice}
              onChangeText={setStartingPrice}
              placeholder="0"
              placeholderTextColor={colors.textMuted}
              style={{
                flex: 1,
                paddingVertical: space.md,
                fontSize: 17,
                fontWeight: "600",
                color: colors.text,
              }}
            />
          </View>
          <TextLabel style={{ marginBottom: space.sm }}>Quick adjust step (for + / −)</TextLabel>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: space.sm, marginBottom: space.sm }}>
            {PRICE_JUMPS.map((j) => (
              <Pressable
                key={j}
                onPress={() => setPriceJump(j)}
                style={{
                  paddingHorizontal: space.md,
                  paddingVertical: space.sm,
                  borderRadius: radii.md,
                  borderWidth: 1,
                  borderColor: priceJump === j ? colors.text : colors.border,
                  backgroundColor: priceJump === j ? colors.surfaceMuted : "transparent",
                }}
              >
                <TextBody style={{ fontWeight: priceJump === j ? "600" : "400" }}>±{j}</TextBody>
              </Pressable>
            ))}
          </View>
          <View style={{ flexDirection: "row", alignItems: "center", marginBottom: space.lg, gap: space.md }}>
            <Pressable
              onPress={() => adjustStarting(-priceJump)}
              style={{
                width: 48,
                height: 48,
                borderRadius: radii.md,
                borderWidth: 1,
                borderColor: colors.border,
                alignItems: "center",
                justifyContent: "center",
                backgroundColor: colors.surfaceMuted,
              }}
            >
              <TextBody style={{ fontSize: 22, fontWeight: "600" }}>−</TextBody>
            </Pressable>
            <Pressable
              onPress={() => adjustStarting(priceJump)}
              style={{
                width: 48,
                height: 48,
                borderRadius: radii.md,
                borderWidth: 1,
                borderColor: colors.border,
                alignItems: "center",
                justifyContent: "center",
                backgroundColor: colors.surfaceMuted,
              }}
            >
              <TextBody style={{ fontSize: 22, fontWeight: "600" }}>+</TextBody>
            </Pressable>
            <TextBody style={{ flex: 1, color: colors.textMuted, fontSize: 13 }}>
              +/− moves the start price by {priceJump} MVR each tap.
            </TextBody>
          </View>

          <TextLabel style={{ marginBottom: space.sm }}>Min bid increment step (for ±)</TextLabel>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: space.sm, marginBottom: space.sm }}>
            {INC_STEPS.map((j) => (
              <Pressable
                key={j}
                onPress={() => setIncStep(j)}
                style={{
                  paddingHorizontal: space.md,
                  paddingVertical: space.sm,
                  borderRadius: radii.md,
                  borderWidth: 1,
                  borderColor: incStep === j ? colors.text : colors.border,
                  backgroundColor: incStep === j ? colors.surfaceMuted : "transparent",
                }}
              >
                <TextBody style={{ fontWeight: incStep === j ? "600" : "400" }}>±{j}</TextBody>
              </Pressable>
            ))}
          </View>
          <View style={{ marginBottom: space.lg }}>
            <NumericStepper
              label="Minimum bid increment (MVR)"
              value={minInc}
              min={1}
              step={incStep}
              onChange={setMinInc}
            />
          </View>

          <DateTimeField label="Auction starts" value={startsAt} mode="datetime" onChange={setStartsAt} />
          <DateTimeField
            label="Auction ends"
            value={endsAt}
            mode="datetime"
            onChange={setEndsAt}
            minimumDate={startsAt}
          />
        </View>
      ) : null}

      {subStep === 4 ? (
        <View style={{ marginBottom: space.lg }}>
          <TextLabel style={{ marginBottom: space.sm }}>Listing type</TextLabel>
          <View style={{ flexDirection: "row", gap: space.sm, marginBottom: space.lg }}>
            {(
              [
                ["standard", "Standard"],
                ["featured", "Featured (fee)"],
              ] as const
            ).map(([id, label]) => (
              <Pressable
                key={id}
                onPress={() => setBidType(id)}
                style={{
                  flex: 1,
                  padding: space.md,
                  borderRadius: radii.md,
                  borderWidth: 2,
                  borderColor: bidType === id ? colors.primary : colors.border,
                  backgroundColor: bidType === id ? colors.accentMuted : colors.background,
                }}
              >
                <TextBody style={{ fontWeight: "600", textAlign: "center" }}>{label}</TextBody>
              </Pressable>
            ))}
          </View>

          <InfoCallout message={LISTING_PAYMENT_AND_FULFILMENT_DISCLAIMER} />
          <TextCaption style={{ marginTop: space.md, marginBottom: space.sm, color: colors.textSecondary }}>
            {LISTING_PAYMENT_INSTRUCTIONS_CAPTION}
          </TextCaption>

          <TextArea
            label="Payment instructions for the winner (optional)"
            value={paymentInstructions}
            onChangeText={setPaymentInstructions}
            placeholder="e.g. bank name and account holder — shared only after the sale."
          />
        </View>
      ) : null}

      <View style={{ flexDirection: "row", marginTop: space.md, gap: space.sm }}>
        <View style={{ flex: 1 }}>
          {subStep === 0 ? (
            <ButtonSecondary title="Exit" onPress={() => router.replace("/(tabs)" as Href)} />
          ) : (
            <ButtonSecondary title="Back" onPress={goPrevCreateSubstep} />
          )}
        </View>
        <View style={{ flex: 1 }}>
          <ButtonPrimary
            title={subStep === lastCreateSubstep ? "Continue to terms" : "Next"}
            icon={subStep === lastCreateSubstep ? "arrow-forward-outline" : "chevron-forward-outline"}
            loading={loading && subStep === lastCreateSubstep}
            onPress={primaryWizardAction}
            disabled={!session || !canList}
          />
        </View>
      </View>
    </Screen>
  );
}
