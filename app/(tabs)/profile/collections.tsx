import { useCallback, useState } from "react";
import { ActivityIndicator, FlatList, Image, Pressable, RefreshControl, View } from "react-native";
import { router, useFocusEffect, type Href } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { Screen } from "@/src/components/ui/Screen";
import { TextTitle } from "@/src/components/ui/TextTitle";
import { TextBody } from "@/src/components/ui/TextBody";
import { TextCaption } from "@/src/components/ui/TextCaption";
import { ButtonPrimary } from "@/src/components/ui/ButtonPrimary";
import { ListEmptyState } from "@/src/components/ui/ListEmptyState";
import { useAuth } from "@/src/providers/AuthProvider";
import { useMySellerCollections } from "@/src/data/seller-collections";
import { supabase } from "@/src/lib/supabase";
import { colors, radii, space } from "@/src/theme/tokens";
import { useQueryClient } from "@tanstack/react-query";

export default function ProfileCollectionsListScreen() {
  const { session } = useAuth();
  const qc = useQueryClient();
  const { data, isPending, isRefetching, refetch } = useMySellerCollections();
  const [creating, setCreating] = useState(false);

  useFocusEffect(
    useCallback(() => {
      void refetch();
    }, [refetch]),
  );

  if (!session) {
    return (
      <Screen scroll>
        <TextTitle>Collections</TextTitle>
        <TextBody style={{ marginTop: space.md }}>Sign in to manage collections.</TextBody>
        <ButtonPrimary title="Log in" onPress={() => router.push("/(auth)/login")} style={{ marginTop: space.lg }} />
      </Screen>
    );
  }

  async function createCollection() {
    if (!session) return;
    setCreating(true);
    try {
      const { data: row, error } = await supabase
        .from("seller_collections")
        .insert({
          seller_id: session.user.id,
          name: "New collection",
          description: "",
        })
        .select("id")
        .single();
      if (error) throw error;
      const id = String((row as { id: string }).id);
      void qc.invalidateQueries({ queryKey: ["seller-collections"] });
      router.push(`/profile/collection/${id}` as Href);
    } catch (e: unknown) {
      console.warn(e);
    } finally {
      setCreating(false);
    }
  }

  const rows = data ?? [];

  return (
    <Screen scroll={false}>
      <TextTitle>Collections</TextTitle>
      <TextCaption style={{ marginTop: space.xs, color: colors.textMuted }}>
        Optional groups for your storefront. Add a name, description, cover, and listings.
      </TextCaption>
      <ButtonPrimary
        title={creating ? "Creating…" : "New collection"}
        onPress={() => void createCollection()}
        disabled={creating}
        style={{ marginTop: space.lg }}
      />

      {isPending && rows.length === 0 ? (
        <View style={{ paddingVertical: space.xxl, alignItems: "center" }}>
          <ActivityIndicator color={colors.primary} />
        </View>
      ) : (
        <FlatList
          style={{ marginTop: space.lg }}
          data={rows}
          keyExtractor={(item) => item.id}
          refreshControl={
            <RefreshControl refreshing={isRefetching} onRefresh={() => void refetch()} tintColor={colors.primary} />
          }
          ListEmptyComponent={
            <ListEmptyState
              icon="albums-outline"
              title="No collections yet"
              description="Create one to curate listings on your seller page."
            />
          }
          contentContainerStyle={{ paddingBottom: space.xxl, flexGrow: 1 }}
          renderItem={({ item }) => (
            <Pressable
              onPress={() => router.push(`/profile/collection/${item.id}` as Href)}
              style={({ pressed }) => ({
                flexDirection: "row",
                alignItems: "center",
                gap: space.md,
                padding: space.md,
                marginBottom: space.sm,
                borderRadius: radii.lg,
                borderWidth: 1,
                borderColor: colors.border,
                backgroundColor: pressed ? colors.surfaceMuted : colors.background,
              })}
            >
              <View
                style={{
                  width: 56,
                  height: 56,
                  borderRadius: radii.md,
                  overflow: "hidden",
                  backgroundColor: colors.surfaceMuted,
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                {item.cover_url ? (
                  <Image source={{ uri: item.cover_url }} style={{ width: 56, height: 56 }} resizeMode="cover" />
                ) : (
                  <Ionicons name="image-outline" size={22} color={colors.textMuted} />
                )}
              </View>
              <View style={{ flex: 1, minWidth: 0 }}>
                <TextBody style={{ fontWeight: "600" }} numberOfLines={2}>
                  {item.name}
                </TextBody>
                {item.description.trim() ? (
                  <TextCaption numberOfLines={2} style={{ marginTop: 4, color: colors.textSecondary }}>
                    {item.description.trim()}
                  </TextCaption>
                ) : null}
              </View>
              <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
            </Pressable>
          )}
        />
      )}
    </Screen>
  );
}
