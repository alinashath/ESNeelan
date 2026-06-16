import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  Pressable,
  View,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import { router, useLocalSearchParams, useFocusEffect, type Href } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { Screen } from "@/src/components/ui/Screen";
import { TextTitle } from "@/src/components/ui/TextTitle";
import { TextBody } from "@/src/components/ui/TextBody";
import { TextCaption } from "@/src/components/ui/TextCaption";
import { TextField } from "@/src/components/ui/TextField";
import { TextArea } from "@/src/components/ui/TextArea";
import { ButtonPrimary } from "@/src/components/ui/ButtonPrimary";
import { ButtonSecondary } from "@/src/components/ui/ButtonSecondary";
import { useAuth } from "@/src/providers/AuthProvider";
import {
  useInvalidateSellerCollections,
  useSellerCollectionDetail,
} from "@/src/data/seller-collections";
import { useMyAuctions } from "@/src/data/user-auctions";
import { supabase } from "@/src/lib/supabase";
import { SELLER_COLLECTION_COVERS_BUCKET } from "@/src/lib/seller-collection-cover";
import { colors, radii, space } from "@/src/theme/tokens";

export default function ProfileCollectionEditorScreen() {
  const params = useLocalSearchParams<{ id: string | string[] }>();
  const id =
    typeof params.id === "string" ? params.id : Array.isArray(params.id) ? (params.id[0] ?? "") : "";
  const { session } = useAuth();
  const { data, isPending, refetch, isError, error } = useSellerCollectionDetail(id || undefined);
  const { data: myAuctions, refetch: refetchAuctions } = useMyAuctions();
  const { invalidateCollection, invalidateAll } = useInvalidateSellerCollections();

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [savingMeta, setSavingMeta] = useState(false);
  const [uploadingCover, setUploadingCover] = useState(false);
  const [busyAuctionId, setBusyAuctionId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  useFocusEffect(
    useCallback(() => {
      void refetch();
      void refetchAuctions();
    }, [refetch, refetchAuctions]),
  );

  useEffect(() => {
    if (!data) return;
    setName(data.name);
    setDescription(data.description);
  }, [data?.id, data?.name, data?.description]);

  const isOwner = useMemo(() => {
    if (!session || !data) return false;
    return data.seller_id === session.user.id;
  }, [session, data]);

  const itemIds = useMemo(() => new Set((data?.items ?? []).map((i) => i.id)), [data?.items]);

  async function saveMeta() {
    if (!id || !session || !isOwner) return;
    const trimmed = name.trim();
    if (!trimmed) {
      Alert.alert("Name required", "Give this collection a name.");
      return;
    }
    setSavingMeta(true);
    try {
      const { error: upErr } = await supabase
        .from("seller_collections")
        .update({
          name: trimmed,
          description: description.trim(),
        })
        .eq("id", id)
        .eq("seller_id", session.user.id);
      if (upErr) throw upErr;
      void invalidateCollection(id);
      await refetch();
      Alert.alert("Saved", "Collection details updated.");
    } catch (e: unknown) {
      Alert.alert("Error", e instanceof Error ? e.message : "Could not save.");
    } finally {
      setSavingMeta(false);
    }
  }

  async function pickCover() {
    if (!id || !session || !isOwner) return;
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert("Photos", "Allow photo library access to set a cover image.");
      return;
    }
    const picked = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.85,
    });
    if (picked.canceled || !picked.assets[0]) return;
    const asset = picked.assets[0];
    setUploadingCover(true);
    try {
      const path = `${id}/${Date.now()}_cover.jpg`;
      const res = await fetch(asset.uri);
      if (!res.ok) throw new Error(`Could not read image (${res.status}).`);
      const buf = await res.arrayBuffer();
      const body = new Uint8Array(buf);
      const prevPath = data?.cover_storage_path;
      const { error: upErr } = await supabase.storage
        .from(SELLER_COLLECTION_COVERS_BUCKET)
        .upload(path, body, {
          contentType: asset.mimeType ?? "image/jpeg",
          upsert: false,
        });
      if (upErr) throw upErr;
      const { error: dbErr } = await supabase
        .from("seller_collections")
        .update({ cover_storage_path: path })
        .eq("id", id)
        .eq("seller_id", session.user.id);
      if (dbErr) throw dbErr;
      if (prevPath && prevPath !== path) {
        const { error: rmErr } = await supabase.storage
          .from(SELLER_COLLECTION_COVERS_BUCKET)
          .remove([prevPath]);
        if (rmErr) console.warn("remove old cover", rmErr.message);
      }
      void invalidateCollection(id);
      await refetch();
    } catch (e: unknown) {
      Alert.alert("Cover", e instanceof Error ? e.message : "Upload failed.");
    } finally {
      setUploadingCover(false);
    }
  }

  async function removeCover() {
    if (!id || !session || !isOwner || !data?.cover_storage_path) return;
    const prev = data.cover_storage_path;
    setUploadingCover(true);
    try {
      const { error: dbErr } = await supabase
        .from("seller_collections")
        .update({ cover_storage_path: null })
        .eq("id", id)
        .eq("seller_id", session.user.id);
      if (dbErr) throw dbErr;
      const { error: rmErr } = await supabase.storage.from(SELLER_COLLECTION_COVERS_BUCKET).remove([prev]);
      if (rmErr) console.warn("storage remove cover", rmErr.message);
      void invalidateCollection(id);
      await refetch();
    } catch (e: unknown) {
      Alert.alert("Error", e instanceof Error ? e.message : "Could not remove cover.");
    } finally {
      setUploadingCover(false);
    }
  }

  async function toggleAuctionInCollection(auctionId: string, currentlyIn: boolean) {
    if (!id || !session || !isOwner) return;
    setBusyAuctionId(auctionId);
    try {
      if (currentlyIn) {
        const { error } = await supabase
          .from("seller_collection_items")
          .delete()
          .eq("collection_id", id)
          .eq("auction_id", auctionId);
        if (error) throw error;
      } else {
        const maxSort = Math.max(0, ...(data?.items ?? []).map((i) => i.sort_order));
        const { error } = await supabase.from("seller_collection_items").insert({
          collection_id: id,
          auction_id: auctionId,
          sort_order: maxSort + 1,
        });
        if (error) throw error;
      }
      void invalidateCollection(id);
      invalidateAll();
      await refetch();
    } catch (e: unknown) {
      Alert.alert("Listings", e instanceof Error ? e.message : "Could not update.");
    } finally {
      setBusyAuctionId(null);
    }
  }

  async function deleteCollection() {
    if (!id || !session || !isOwner) return;
    Alert.alert(
      "Delete collection",
      "This removes the group from your storefront. Your listings are not deleted.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            setDeleting(true);
            try {
              const path = data?.cover_storage_path;
              const { error } = await supabase.from("seller_collections").delete().eq("id", id);
              if (error) throw error;
              if (path) {
                await supabase.storage.from(SELLER_COLLECTION_COVERS_BUCKET).remove([path]);
              }
              invalidateAll();
              router.replace("/profile/collections" as Href);
            } catch (e: unknown) {
              Alert.alert("Error", e instanceof Error ? e.message : "Could not delete.");
            } finally {
              setDeleting(false);
            }
          },
        },
      ],
    );
  }

  if (!id) {
    return (
      <Screen scroll>
        <TextBody>Invalid link.</TextBody>
      </Screen>
    );
  }

  if (!session) {
    return (
      <Screen scroll>
        <TextTitle>Collection</TextTitle>
        <ButtonPrimary title="Log in" onPress={() => router.push("/(auth)/login")} style={{ marginTop: space.lg }} />
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

  if (isPending || !data) {
    return (
      <Screen scroll>
        <ActivityIndicator color={colors.primary} style={{ marginTop: space.xl }} />
      </Screen>
    );
  }

  if (!isOwner) {
    return (
      <Screen scroll>
        <TextTitle>Not your collection</TextTitle>
        <TextBody style={{ marginTop: space.md }}>You can only edit collections you created.</TextBody>
      </Screen>
    );
  }

  const auctionRows = (myAuctions ?? []) as { id: string; title?: string; status?: string; image_url?: string | null }[];

  return (
    <Screen scroll>
      <TextTitle>Edit collection</TextTitle>
      <TextCaption style={{ marginTop: space.xs, color: colors.textMuted }}>
        Shoppers see this on your seller page when you add listings here.
      </TextCaption>

      <View style={{ marginTop: space.lg }}>
        <TextCaption style={{ marginBottom: space.xs, fontWeight: "600" }}>COVER (OPTIONAL)</TextCaption>
        <View style={{ flexDirection: "row", alignItems: "center", gap: space.md }}>
          <View
            style={{
              width: 96,
              height: 96,
              borderRadius: radii.md,
              overflow: "hidden",
              backgroundColor: colors.surfaceMuted,
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            {data.cover_url ? (
              <Image source={{ uri: data.cover_url }} style={{ width: 96, height: 96 }} resizeMode="cover" />
            ) : (
              <Ionicons name="image-outline" size={28} color={colors.textMuted} />
            )}
          </View>
          <View style={{ flex: 1, gap: space.sm }}>
            <ButtonSecondary
              title={uploadingCover ? "Working…" : data.cover_url ? "Change cover" : "Add cover"}
              onPress={() => void pickCover()}
              disabled={uploadingCover}
            />
            {data.cover_url ? (
              <ButtonSecondary title="Remove cover" onPress={() => void removeCover()} disabled={uploadingCover} />
            ) : null}
          </View>
        </View>
      </View>

      <TextField label="Name" value={name} onChangeText={setName} style={{ marginTop: space.lg }} />
      <TextArea
        label="Description (optional)"
        value={description}
        onChangeText={setDescription}
        style={{ marginTop: space.md }}
      />
      <ButtonPrimary
        title={savingMeta ? "Saving…" : "Save name & description"}
        onPress={() => void saveMeta()}
        disabled={savingMeta}
        style={{ marginTop: space.md }}
      />

      <TextTitle style={{ marginTop: space.xl, fontSize: 18 }}>Listings in this collection</TextTitle>
      <TextCaption style={{ marginTop: space.xs, color: colors.textMuted }}>
        Toggle your auctions. Optional — leave empty until you are ready.
      </TextCaption>

      <FlatList
        scrollEnabled={false}
        data={auctionRows}
        keyExtractor={(a) => a.id}
        style={{ marginTop: space.md }}
        ListEmptyComponent={<TextCaption>No auctions on your account yet.</TextCaption>}
        renderItem={({ item: a }) => {
          const inCol = itemIds.has(a.id);
          const busy = busyAuctionId === a.id;
          return (
            <Pressable
              onPress={() => void toggleAuctionInCollection(a.id, inCol)}
              disabled={busy}
              style={({ pressed }) => ({
                flexDirection: "row",
                alignItems: "center",
                gap: space.md,
                paddingVertical: space.sm,
                paddingHorizontal: space.sm,
                borderRadius: radii.md,
                borderWidth: 1,
                borderColor: inCol ? colors.primary : colors.border,
                marginBottom: space.sm,
                backgroundColor: pressed ? colors.surfaceMuted : colors.background,
                opacity: busy ? 0.6 : 1,
              })}
            >
              <View
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: radii.sm,
                  overflow: "hidden",
                  backgroundColor: colors.surfaceMuted,
                }}
              >
                {a.image_url ? (
                  <Image source={{ uri: a.image_url }} style={{ width: 44, height: 44 }} resizeMode="cover" />
                ) : null}
              </View>
              <View style={{ flex: 1, minWidth: 0 }}>
                <TextBody numberOfLines={2} style={{ fontWeight: "500" }}>
                  {String(a.title ?? "Listing")}
                </TextBody>
                <TextCaption style={{ color: colors.textSecondary }}>{String(a.status ?? "")}</TextCaption>
              </View>
              <Ionicons name={inCol ? "checkmark-circle" : "ellipse-outline"} size={24} color={colors.primary} />
            </Pressable>
          );
        }}
      />

      <ButtonSecondary
        title="View public page"
        onPress={() => router.push(`/collection/${id}` as Href)}
        style={{ marginTop: space.lg }}
      />

      <ButtonSecondary
        title={deleting ? "Deleting…" : "Delete collection"}
        onPress={() => void deleteCollection()}
        disabled={deleting}
        style={{ marginTop: space.md }}
      />
    </Screen>
  );
}
