import { useEffect, useMemo, useState } from "react";
import { Alert, Image, Pressable, ScrollView, View } from "react-native";
import * as ImagePicker from "expo-image-picker";
import { router } from "expo-router";
import { supabase } from "@/src/lib/supabase";
import { useAuth } from "@/src/providers/AuthProvider";
import { useCategories } from "@/src/data/auctions";
import { Screen } from "@/src/components/ui/Screen";
import { TextTitle } from "@/src/components/ui/TextTitle";
import { TextField } from "@/src/components/ui/TextField";
import { TextArea } from "@/src/components/ui/TextArea";
import { SelectField } from "@/src/components/ui/SelectField";
import { NumericStepper } from "@/src/components/ui/NumericStepper";
import { DateTimeField } from "@/src/components/ui/DateTimeField";
import { ButtonPrimary } from "@/src/components/ui/ButtonPrimary";
import { ButtonSecondary } from "@/src/components/ui/ButtonSecondary";
import { TextBody } from "@/src/components/ui/TextBody";
import { InfoCallout } from "@/src/components/ui/InfoCallout";
import { colors, radii, space } from "@/src/theme/tokens";

type Picked = { uri: string; mime?: string };

export default function CreateAuctionScreen() {
  const { session, profile } = useAuth();
  const { data: categories } = useCategories();
  const realCats = useMemo(
    () => (categories ?? []).filter((c) => c.slug !== "all"),
    [categories],
  );
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [location, setLocation] = useState("");
  const [terms, setTerms] = useState("");
  const [paymentInstructions, setPaymentInstructions] = useState("");
  const [categoryId, setCategoryId] = useState<string>("");
  const [startingPrice, setStartingPrice] = useState("10");
  const [minInc, setMinInc] = useState(5);
  const [startsAt, setStartsAt] = useState(new Date());
  const [endsAt, setEndsAt] = useState(
    () => new Date(Date.now() + 25 * 3600 * 1000),
  );
  const [photos, setPhotos] = useState<Picked[]>([]);
  const [loading, setLoading] = useState(false);

  const catOptions = useMemo(
    () => realCats.map((c) => ({ value: c.id, label: c.name })),
    [realCats],
  );

  useEffect(() => {
    if (realCats.length && !categoryId) {
      setCategoryId(realCats[0].id);
    }
  }, [realCats, categoryId]);

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
      ...res.assets.map((a) => ({ uri: a.uri, mime: a.mimeType ?? "image/jpeg" })),
    ]);
  }

  async function submit() {
    if (!session) {
      router.push("/(auth)/login");
      return;
    }
    if (profile?.suspended_at) {
      Alert.alert("Suspended", "Your account cannot create listings.");
      return;
    }
    const sp = Number(startingPrice);
    if (!title.trim() || !categoryId || !Number.isFinite(sp) || sp < 0) {
      Alert.alert("Check fields", "Title, category, and valid starting price are required.");
      return;
    }
    const minMs = 24 * 3600 * 1000;
    if (endsAt.getTime() - startsAt.getTime() < minMs) {
      Alert.alert("Duration", "Auction must run at least 24 hours.");
      return;
    }
    setLoading(true);
    try {
      const { data: ins, error: insErr } = await supabase
        .from("auctions")
        .insert({
          seller_id: session.user.id,
          title: title.trim(),
          description: description.trim(),
          location: location.trim(),
          terms: terms.trim(),
          category_id: categoryId,
          starting_price: sp,
          min_bid_increment: minInc,
          starts_at: startsAt.toISOString(),
          ends_at: endsAt.toISOString(),
          status: "draft",
          payment_instructions: paymentInstructions.trim() || null,
        })
        .select("id")
        .single();
      if (insErr) throw insErr;
      const auctionId = ins.id as string;

      let order = 0;
      for (const ph of photos) {
        const path = `${auctionId}/${Date.now()}_${order}.jpg`;
        const res = await fetch(ph.uri);
        const blob = await res.blob();
        const { error: upErr } = await supabase.storage
          .from("auction-images")
          .upload(path, blob, {
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

      const { data: rpc, error: rpcErr } = await supabase.rpc(
        "submit_auction_for_approval",
        { p_auction_id: auctionId },
      );
      if (rpcErr) throw rpcErr;
      if (rpc && typeof rpc === "object" && "ok" in rpc && rpc.ok === false) {
        throw new Error(String((rpc as { error?: string }).error));
      }
      Alert.alert("Submitted", "Your listing is pending admin approval.");
      router.push("/my-auctions");
    } catch (e: unknown) {
      Alert.alert("Error", e instanceof Error ? e.message : "Could not save");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Screen scroll>
      <TextTitle style={{ marginBottom: space.md }}>Create auction</TextTitle>
      {!session ? (
        <TextBody style={{ marginBottom: space.lg }}>
          Sign in to list an item.
        </TextBody>
      ) : null}

      <Pressable
        onPress={pickPhotos}
        style={{
          borderWidth: 1,
          borderColor: colors.border,
          borderRadius: radii.md,
          padding: space.lg,
          marginBottom: space.lg,
          backgroundColor: colors.surfaceMuted,
        }}
      >
        <TextBody style={{ fontWeight: "700" }}>ADD PHOTOS</TextBody>
        <ScrollView horizontal style={{ marginTop: space.md }}>
          {photos.map((p, i) => (
            <Image
              key={i}
              source={{ uri: p.uri }}
              style={{
                width: 72,
                height: 72,
                borderRadius: radii.sm,
                marginRight: space.sm,
              }}
            />
          ))}
        </ScrollView>
      </Pressable>

      <TextField label="ITEM TITLE" value={title} onChangeText={setTitle} />
      {catOptions.length > 0 && categoryId ? (
        <SelectField
          label="CATEGORY"
          value={categoryId}
          options={catOptions}
          onSelect={(v) => setCategoryId(v)}
        />
      ) : null}
      <TextArea
        label="DESCRIPTION"
        value={description}
        onChangeText={setDescription}
      />
      <TextField label="LOCATION" value={location} onChangeText={setLocation} />
      <TextArea label="TERMS OR CONDITIONS" value={terms} onChangeText={setTerms} />
      <TextField
        label="STARTING PRICE (MVR)"
        keyboardType="decimal-pad"
        value={startingPrice}
        onChangeText={setStartingPrice}
      />
      <View style={{ marginBottom: space.lg }}>
        <NumericStepper
          label="MIN BID INCREMENT (MVR)"
          value={minInc}
          min={1}
          step={1}
          onChange={setMinInc}
        />
      </View>
      <DateTimeField label="START" value={startsAt} onChange={setStartsAt} />
      <DateTimeField
        label="END DATE"
        value={endsAt}
        mode="date"
        onChange={(d) => {
          const nd = new Date(d);
          nd.setHours(23, 59, 0, 0);
          setEndsAt(nd);
        }}
      />
      <TextArea
        label="PAYMENT INSTRUCTIONS (SHOWN TO WINNER)"
        value={paymentInstructions}
        onChangeText={setPaymentInstructions}
        placeholder="Bank transfer details, pickup cash, etc."
      />

      <InfoCallout message="MINIMUM 24H DURATION REQUIRED." />

      <View
        style={{
          flexDirection: "row",
          marginTop: space.md,
        }}
      >
        <View style={{ flex: 1, marginRight: space.sm }}>
          <ButtonSecondary title="Preview" onPress={() => {}} />
        </View>
        <View style={{ flex: 1 }}>
          <ButtonPrimary
            title="Submit listing"
            loading={loading}
            onPress={submit}
            disabled={!session}
          />
        </View>
      </View>
    </Screen>
  );
}
