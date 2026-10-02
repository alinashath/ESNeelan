import { useMemo, useState } from "react";
import { Alert, FlatList, Pressable, Switch, TextInput, View } from "react-native";
import { router, type Href } from "expo-router";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/src/lib/supabase";
import { Screen } from "@/src/components/ui/Screen";
import { TextTitle } from "@/src/components/ui/TextTitle";
import { TextBody } from "@/src/components/ui/TextBody";
import { TextCaption } from "@/src/components/ui/TextCaption";
import { TextLabel } from "@/src/components/ui/TextLabel";
import { ButtonSecondary } from "@/src/components/ui/ButtonSecondary";
import { ManagedListToolbar } from "@/src/components/ui/ManagedListToolbar";
import { Chip } from "@/src/components/ui/Chip";
import { ChipRow } from "@/src/components/ui/ChipRow";
import { useAuth } from "@/src/providers/AuthProvider";
import {
  useAdminCollectionsFeaturedList,
  type SellerCollectionRow,
} from "@/src/data/seller-collections";
import { adminDeleteSellerCollection } from "@/src/data/admin-content";
import { confirmAction } from "@/src/lib/confirm-action";
import {
  compareIsoDates,
  compareStringsCaseInsensitive,
  textMatchesQuery,
} from "@/src/lib/managed-list";
import { colors, radii, space } from "@/src/theme/tokens";
import { Ionicons } from "@expo/vector-icons";

type SpotFilter = "all" | "featured" | "not_featured";

export default function AdminFeaturedCollectionsScreen() {
  const { profile } = useAuth();
  const qc = useQueryClient();
  const [sortDrafts, setSortDrafts] = useState<Record<string, string>>({});
  const [search, setSearch] = useState("");
  const [sortId, setSortId] = useState("featured");
  const [spot, setSpot] = useState<SpotFilter>("all");

  const { data, refetch, isRefetching } = useAdminCollectionsFeaturedList({
    enabled: profile?.role === "admin",
  });
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const rows = data ?? [];

  const filtered = useMemo(() => {
    const list = rows.filter((c) => {
      if (spot === "featured" && !c.is_featured) return false;
      if (spot === "not_featured" && c.is_featured) return false;
      const hay = `${c.name} ${c.seller_display_name ?? ""}`;
      return textMatchesQuery(hay, search);
    });
    const copy = [...list];
    if (sortId === "title_az") {
      copy.sort((a, b) => compareStringsCaseInsensitive(a.name, b.name, "asc"));
    } else if (sortId === "title_za") {
      copy.sort((a, b) => compareStringsCaseInsensitive(a.name, b.name, "desc"));
    } else if (sortId === "newest") {
      copy.sort((a, b) => compareIsoDates(String(a.created_at ?? ""), String(b.created_at ?? ""), "desc"));
    } else if (sortId === "oldest") {
      copy.sort((a, b) => compareIsoDates(String(a.created_at ?? ""), String(b.created_at ?? ""), "asc"));
    } else {
      copy.sort((a, b) => {
        const fa = a.is_featured ? 0 : 1;
        const fb = b.is_featured ? 0 : 1;
        if (fa !== fb) return fa - fb;
        const sa = a.featured_sort_order ?? 999999;
        const sb = b.featured_sort_order ?? 999999;
        if (sa !== sb) return sa - sb;
        return compareIsoDates(String(a.created_at ?? ""), String(b.created_at ?? ""), "desc");
      });
    }
    return copy;
  }, [rows, search, sortId, spot]);

  async function removeCollection(row: SellerCollectionRow) {
    const ok = await confirmAction({
      title: "Delete collection",
      message: `Permanently delete “${row.name}”? Items in this collection will be unlinked. This cannot be undone.`,
      confirmLabel: "Delete",
      cancelLabel: "Cancel",
      destructive: true,
    });
    if (!ok) return;

    setDeletingId(row.id);
    try {
      await adminDeleteSellerCollection(row.id);
      await refetch();
      qc.invalidateQueries({ queryKey: ["seller-collections"] });
      qc.invalidateQueries({ queryKey: ["admin", "seller-collections-featured"] });
    } catch (e: unknown) {
      Alert.alert("Error", e instanceof Error ? e.message : "Could not delete collection.");
    } finally {
      setDeletingId(null);
    }
  }

  async function setFeatured(id: string, next: boolean) {
    const { data: rpc, error } = await supabase.rpc("admin_set_seller_collection_featured", {
      p_collection_id: id,
      p_featured: next,
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
    void qc.invalidateQueries({ queryKey: ["seller-collections"] });
    void qc.invalidateQueries({ queryKey: ["seller-collection"] });
  }

  async function saveSort(id: string, featured: boolean) {
    if (!featured) return;
    const raw = (sortDrafts[id] ?? "").trim();
    const n = raw === "" ? 0 : Number(raw);
    if (!Number.isFinite(n) || n < 0 || n > 1_000_000) {
      Alert.alert("Sort order", "Enter a non-negative integer (lower shows first).");
      return;
    }
    const { data: rpc, error } = await supabase.rpc("admin_set_seller_collection_featured_sort_order", {
      p_collection_id: id,
      p_sort_order: Math.floor(n),
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
    void qc.invalidateQueries({ queryKey: ["seller-collections"] });
    setSortDrafts((prev) => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
    Alert.alert("Saved", "Featured order updated.");
  }

  if (profile?.role !== "admin") {
    return (
      <Screen scroll>
        <TextTitle>Featured collections</TextTitle>
        <TextBody style={{ marginTop: space.lg }}>Admin only.</TextBody>
      </Screen>
    );
  }

  const filterSlot = (
    <View>
      <TextLabel style={{ marginBottom: space.sm }}>SPOTLIGHT</TextLabel>
      <ChipRow>
        {(
          [
            ["all", "ALL"],
            ["featured", "FEATURED"],
            ["not_featured", "NOT FEATURED"],
          ] as const
        ).map(([id, label]) => (
          <Chip
            key={id}
            title={label}
            appearance="outlined"
            selected={spot === id}
            onPress={() => setSpot(id)}
          />
        ))}
      </ChipRow>
    </View>
  );

  return (
    <Screen scroll={false}>
      <FlatList
        showsVerticalScrollIndicator={false}
        data={filtered}
        keyExtractor={(item) => item.id}
        refreshing={isRefetching}
        onRefresh={() => void refetch()}
        ListHeaderComponent={
          <>
            <TextTitle style={{ marginBottom: space.xs }}>Featured collections</TextTitle>
            <TextCaption style={{ marginBottom: space.lg, color: colors.textMuted }}>
              Spotlight collections on the Events tab. Lower sort order appears first.
            </TextCaption>
            <ManagedListToolbar
              search={search}
              onSearchChange={setSearch}
              searchPlaceholder="Search by name or seller"
              sortId={sortId}
              onSortChange={setSortId}
              sortOptions={[
                { id: "featured", label: "Featured order" },
                { id: "newest", label: "Newest" },
                { id: "oldest", label: "Oldest" },
                { id: "title_az", label: "Name A–Z" },
                { id: "title_za", label: "Name Z–A" },
              ]}
              filterSlot={filterSlot}
            />
            <TextCaption style={{ marginBottom: space.md, color: colors.textMuted }}>
              {filtered.length} collection{filtered.length === 1 ? "" : "s"}
            </TextCaption>
          </>
        }
        contentContainerStyle={{ paddingBottom: space.xxl }}
        renderItem={({ item }: { item: SellerCollectionRow }) => (
          <View
            style={{
              borderWidth: 1,
              borderColor: colors.border,
              borderRadius: radii.lg,
              padding: space.md,
              marginBottom: space.sm,
              backgroundColor: colors.background,
            }}
          >
            <Pressable
              onPress={() => router.push(`/collection/${item.id}` as Href)}
              accessibilityRole="button"
              style={({ pressed }) => ({ opacity: pressed ? 0.9 : 1 })}
            >
              <TextBody style={{ fontWeight: "600" }}>{item.name}</TextBody>
              <TextCaption style={{ marginTop: 4, color: colors.textSecondary }}>
                {item.seller_display_name?.trim() || "Seller"}
                {item.created_at
                  ? ` · ${new Date(item.created_at).toLocaleDateString()}`
                  : ""}
              </TextCaption>
            </Pressable>

            <View
              style={{
                marginTop: space.md,
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "space-between",
                gap: space.md,
              }}
            >
              <View style={{ flexDirection: "row", alignItems: "center", gap: space.sm }}>
                <Ionicons
                  name={item.is_featured ? "star" : "star-outline"}
                  size={18}
                  color={item.is_featured ? colors.primary : colors.textMuted}
                />
                <TextCaption style={{ fontWeight: "600" }}>Featured</TextCaption>
              </View>
              <Switch
                value={Boolean(item.is_featured)}
                onValueChange={(v) => void setFeatured(item.id, v)}
              />
            </View>

            {item.is_featured ? (
              <View style={{ marginTop: space.md, gap: space.sm }}>
                <TextLabel>SORT ORDER</TextLabel>
                <View style={{ flexDirection: "row", alignItems: "center", gap: space.sm }}>
                  <TextInput
                    value={
                      sortDrafts[item.id] ??
                      (item.featured_sort_order != null ? String(item.featured_sort_order) : "")
                    }
                    onChangeText={(t) => setSortDrafts((prev) => ({ ...prev, [item.id]: t }))}
                    keyboardType="number-pad"
                    placeholder="0"
                    style={{
                      flex: 1,
                      borderWidth: 1,
                      borderColor: colors.border,
                      borderRadius: radii.sm,
                      paddingHorizontal: space.md,
                      paddingVertical: space.sm,
                      color: colors.text,
                      backgroundColor: colors.background,
                    }}
                  />
                  <ButtonSecondary
                    title="Save"
                    onPress={() => void saveSort(item.id, Boolean(item.is_featured))}
                  />
                </View>
              </View>
            ) : null}

            <ButtonSecondary
              title={deletingId === item.id ? "Deleting…" : "Delete collection"}
              icon="trash-outline"
              disabled={deletingId === item.id}
              onPress={() => void removeCollection(item)}
              style={{ marginTop: space.md, alignSelf: "flex-start" }}
            />
          </View>
        )}
        ListEmptyComponent={
          <TextBody style={{ marginTop: space.lg, color: colors.textMuted }}>No collections match.</TextBody>
        }
      />
    </Screen>
  );
}
