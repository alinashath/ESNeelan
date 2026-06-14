import { ButtonPrimary } from "@/src/components/ui/ButtonPrimary";
import { ButtonSecondary } from "@/src/components/ui/ButtonSecondary";
import { DateTimeField } from "@/src/components/ui/DateTimeField";
import { InfoCallout } from "@/src/components/ui/InfoCallout";
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
import { supabase } from "@/src/lib/supabase";
import { useAuth } from "@/src/providers/AuthProvider";
import { colors, radii, space } from "@/src/theme/tokens";
import * as ImagePicker from "expo-image-picker";
import { router, useLocalSearchParams, type Href } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import { Alert, Image, Pressable, ScrollView, TextInput, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { StepIndicator } from "@/src/components/ui/StepIndicator";

type Picked = { uri: string; mime?: string };

const PRICE_JUMPS = [1, 10, 100, 500] as const;
const INC_STEPS = [1, 5, 10, 100, 500, 1000] as const;

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
  const [existingImageCount, setExistingImageCount] = useState(0);

  const curatedList = useMemo(() => curatedCategories ?? [], [curatedCategories]);
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
          auction_categories ( category_id, sort_order ),
          auction_images ( id )
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
      const imgs = r.auction_images as unknown[] | undefined;
      setExistingImageCount(imgs?.length ?? 0);
    })();
    return () => {
      cancelled = true;
    };
  }, [draftIdFromRoute, session?.user.id]);

  function adjustStarting(delta: number) {
    const n = Number(startingPrice);
    const base = Number.isFinite(n) ? n : 0;
    const next = Math.max(0, Math.round((base + delta) * 100) / 100);
    setStartingPrice(String(next));
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
      ...res.assets.map((a) => ({
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
    if (existingImageCount === 0 && photos.length === 0) {
      Alert.alert("Photos", "Add at least one item photo.");
      return;
    }
    const minMs = 24 * 3600 * 1000;
    if (endsAt.getTime() - startsAt.getTime() < minMs) {
      Alert.alert("Duration", "Auction must run at least 24 hours.");
      return;
    }
    setLoading(true);
    try {
      const primaryCategoryId = selectedCategoryIds[0];
      let auctionId = draftIdFromRoute;

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

      let order = existingImageCount;
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
      <TextTitle style={{ marginBottom: space.xs }}>List an item</TextTitle>
      <TextBody style={{ marginBottom: space.md, color: colors.textSecondary }}>
        Step 1 of 3 — details and photos. You will confirm terms next; featured listings include a fee
        step.
      </TextBody>
      {session && profile?.display_name ? (
        <View
          style={{
            alignSelf: "flex-start",
            flexDirection: "row",
            alignItems: "center",
            gap: space.sm,
            backgroundColor: colors.tertiaryMuted,
            paddingHorizontal: space.md,
            paddingVertical: space.sm,
            borderRadius: radii.pill,
            marginBottom: space.lg,
            borderWidth: 1,
            borderColor: colors.border,
          }}
        >
          <Ionicons name="person-circle-outline" size={20} color={colors.primary} />
          <TextCaption style={{ fontWeight: "600", color: colors.primary }}>
            Seller · {profile.display_name}
          </TextCaption>
        </View>
      ) : null}
      {session && !canList ? (
        <InfoCallout message="Seller verification required. Open Profile, tap Apply to sell, then wait for admin approval before you can submit listings." />
      ) : null}
      {!session ? (
        <TextBody style={{ marginBottom: space.lg }}>
          Sign in to list an item.
        </TextBody>
      ) : null}

      <Pressable
        onPress={pickPhotos}
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
        <View style={{ alignItems: "center", paddingVertical: space.md }}>
          <Ionicons name="camera-outline" size={36} color={colors.textMuted} />
        <TextBody style={{ fontWeight: "600", marginTop: space.sm }}>Item photos</TextBody>
        <TextCaption style={{ marginTop: space.xs, textAlign: "center" }}>
          Tap to add from your library. You can select multiple shots.
          {existingImageCount > 0
            ? ` (${existingImageCount} already saved — add more or continue.)`
            : ""}
        </TextCaption>
        </View>
        <ScrollView horizontal style={{ marginTop: space.md }} showsHorizontalScrollIndicator={false} showsVerticalScrollIndicator={false}>
          {photos.map((p, i) => (
            <View key={i} style={{ marginRight: space.sm, position: "relative" }}>
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
            </View>
          ))}
        </ScrollView>
      </Pressable>

      <TextField
        label="AUCTION NAME (PUBLIC LISTING TITLE)"
        value={auctionName}
        onChangeText={setAuctionName}
        placeholder="What you are selling"
      />

      {curatedList.length > 0 ? (
        <SearchableMultiCategoryPicker
          label="CATEGORIES (UP TO 5)"
          categories={curatedList}
          selectedIds={selectedCategoryIds}
          onChange={setSelectedCategoryIds}
        />
      ) : (
        <TextBody style={{ marginBottom: space.lg, color: colors.textMuted }}>
          Loading categories… If this persists, run the latest database migrations.
        </TextBody>
      )}

      <TextArea
        label="DESCRIPTION"
        value={description}
        onChangeText={setDescription}
      />
      <TextField label="LOCATION" value={location} onChangeText={setLocation} />
      <TextArea
        label="TERMS OR CONDITIONS"
        value={terms}
        onChangeText={setTerms}
      />

      <TextLabel style={{ marginBottom: space.sm }}>STARTING PRICE (MVR)</TextLabel>
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
      <TextLabel style={{ marginBottom: space.sm }}>PRICE ADJUST STEP</TextLabel>
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
          +/− uses the selected step ({priceJump} MVR) from the current amount.
        </TextBody>
      </View>

      <TextLabel style={{ marginBottom: space.sm }}>MIN BID INCREMENT STEP (FOR ±)</TextLabel>
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
          label="MIN BID INCREMENT (MVR)"
          value={minInc}
          min={1}
          step={incStep}
          onChange={setMinInc}
        />
      </View>

      <DateTimeField label="START" value={startsAt} mode="datetime" onChange={setStartsAt} />
      <DateTimeField
        label="END"
        value={endsAt}
        mode="datetime"
        onChange={setEndsAt}
        minimumDate={startsAt}
      />

      <TextLabel style={{ marginBottom: space.sm }}>LISTING TYPE</TextLabel>
      <View style={{ flexDirection: "row", gap: space.sm, marginBottom: space.lg }}>
        {(
          [
            ["standard", "Standard listing"],
            ["featured", "Featured listing (fee)"],
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

      <TextArea
        label="PAYMENT INSTRUCTIONS (SHOWN TO WINNER)"
        value={paymentInstructions}
        onChangeText={setPaymentInstructions}
        placeholder="Bank transfer details, pickup cash, etc."
      />

      <View
        style={{
          flexDirection: "row",
          marginTop: space.md,
        }}
      >
        <View style={{ flex: 1, marginRight: space.sm }}>
          <ButtonSecondary
            title="Cancel"
            onPress={() => router.replace("/(tabs)" as Href)}
          />
        </View>
        <View style={{ flex: 1 }}>
          <ButtonPrimary
            title="Continue"
            icon="arrow-forward-outline"
            loading={loading}
            onPress={continueToNext}
            disabled={!session || !canList}
          />
        </View>
      </View>
    </Screen>
  );
}
