import { useMemo, useState } from "react";
import { Alert, FlatList, Pressable, Switch, TextInput, View } from "react-native";
import { router, type Href } from "expo-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
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
  compareIsoDates,
  compareStringsCaseInsensitive,
  textMatchesQuery,
  type SortDir,
} from "@/src/lib/managed-list";
import { colors, radii, space } from "@/src/theme/tokens";
import { Ionicons } from "@expo/vector-icons";

type Row = {
  id: string;
  title: string;
  is_featured: boolean | null;
  featured_sort_order: number | null;
  created_at: string | null;
};

type SpotFilter = "all" | "featured" | "not_featured";

export default function AdminFeaturedScreen() {
  const { profile } = useAuth();
  const qc = useQueryClient();
  const [sortDrafts, setSortDrafts] = useState<Record<string, string>>({});
  const [search, setSearch] = useState("");
  const [sortId, setSortId] = useState("carousel");
  const [spot, setSpot] = useState<SpotFilter>("all");

  const { data, refetch, isLoading, isRefetching } = useQuery({
    queryKey: ["admin", "active-auctions-featured"],
    enabled: profile?.role === "admin",
    queryFn: async () => {
      const { data: rows, error } = await supabase
        .from("auctions")
        .select("id, title, is_featured, featured_sort_order, created_at")
        .eq("status", "active")
        .order("is_featured", { ascending: false })
        .order("featured_sort_order", { ascending: true, nullsFirst: false })
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (rows ?? []) as Row[];
    },
  });

  const rows = data ?? [];

  const filtered = useMemo(() => {
    const list = rows.filter((a) => {
      if (spot === "featured" && !a.is_featured) return false;
      if (spot === "not_featured" && a.is_featured) return false;
      return textMatchesQuery(a.title, search);
    });
    const copy = [...list];
    if (sortId === "title_az") {
      copy.sort((a, b) => compareStringsCaseInsensitive(a.title, b.title, "asc"));
    } else if (sortId === "title_za") {
      copy.sort((a, b) => compareStringsCaseInsensitive(a.title, b.title, "desc"));
    } else if (sortId === "newest") {
      copy.sort((a, b) =>
        compareIsoDates(String(a.created_at ?? ""), String(b.created_at ?? ""), "desc"),
      );
    } else if (sortId === "oldest") {
      copy.sort((a, b) =>
        compareIsoDates(String(a.created_at ?? ""), String(b.created_at ?? ""), "asc"),
      );
    } else {
      const dirFeatured: SortDir = "asc";
      copy.sort((a, b) => {
        const fa = a.is_featured ? 0 : 1;
        const fb = b.is_featured ? 0 : 1;
        if (fa !== fb) return fa - fb;
        const sa = a.featured_sort_order ?? 999999;
        const sb = b.featured_sort_order ?? 999999;
        if (sa !== sb) return dirFeatured === "asc" ? sa - sb : sb - sa;
        return compareIsoDates(String(a.created_at ?? ""), String(b.created_at ?? ""), "desc");
      });
    }
    return copy;
  }, [rows, search, sortId, spot]);

  async function setFeatured(id: string, next: boolean) {
    const { data: rpc, error } = await supabase.rpc("admin_set_auction_featured", {
      p_auction_id: id,
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
    qc.invalidateQueries({ queryKey: ["auctions"] });
  }

  async function saveSort(id: string, featured: boolean) {
    if (!featured) return;
    const raw = (sortDrafts[id] ?? "").trim();
    const n = raw === "" ? 0 : Number(raw);
    if (!Number.isFinite(n) || n < 0 || n > 1_000_000) {
      Alert.alert("Sort order", "Enter a non-negative integer (lower shows first on home).");
      return;
    }
    const { data: rpc, error } = await supabase.rpc("admin_set_auction_featured_sort_order", {
      p_auction_id: id,
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
    qc.invalidateQueries({ queryKey: ["auctions"] });
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
        <TextTitle>Featured</TextTitle>
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
            ["all", "ALL ACTIVE"],
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
        showsHorizontalScrollIndicator={false}
        data={filtered}
        keyExtractor={(item) => item.id}
        refreshing={isRefetching}
        onRefresh={() => void refetch()}
        ListHeaderComponent={
          <>
            <TextTitle style={{ marginBottom: space.xs }}>Home featured</TextTitle>
            <TextBody style={{ marginBottom: space.sm, color: colors.textSecondary }}>
              Search and filter active listings. Tap the title to open the public listing. Toggle
              featured for the home carousel; lower order shows first.
            </TextBody>
            {isLoading ? <TextCaption style={{ marginBottom: space.md }}>Loading…</TextCaption> : null}
            <ManagedListToolbar
              search={search}
              onSearchChange={setSearch}
              searchPlaceholder="Search by title…"
              sortOptions={[
                { id: "carousel", label: "Carousel order" },
                { id: "newest", label: "Newest" },
                { id: "oldest", label: "Oldest" },
                { id: "title_az", label: "Title A–Z" },
                { id: "title_za", label: "Title Z–A" },
              ]}
              sortId={sortId}
              onSortChange={setSortId}
              filterSlot={filterSlot}
            />
          </>
        }
        contentContainerStyle={{
          paddingHorizontal: space.lg,
          paddingBottom: space.xxl,
        }}
        ListEmptyComponent={
          <TextBody style={{ color: colors.textMuted, marginTop: space.lg }}>
            No listings match your filters.
          </TextBody>
        }
        renderItem={({ item: a }) => (
          <View
            style={{
              borderWidth: 1,
              borderColor: colors.border,
              borderRadius: radii.lg,
              padding: space.lg,
              marginBottom: space.md,
              gap: space.md,
            }}
          >
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "space-between",
                gap: space.md,
              }}
            >
              <Pressable
                onPress={() => router.push(`/auction/${a.id}` as Href)}
                style={({ pressed }) => ({
                  flex: 1,
                  flexDirection: "row",
                  alignItems: "center",
                  gap: space.sm,
                  opacity: pressed ? 0.75 : 1,
                })}
              >
                <TextBody style={{ flex: 1, fontWeight: "600" }} numberOfLines={2}>
                  {a.title}
                </TextBody>
                <Ionicons name="open-outline" size={18} color={colors.tertiary} />
              </Pressable>
              <Switch value={Boolean(a.is_featured)} onValueChange={(v) => setFeatured(a.id, v)} />
            </View>
            {a.is_featured ? (
              <View>
                <TextLabel>FEATURED ORDER (OPTIONAL)</TextLabel>
                <TextInput
                  value={
                    sortDrafts[a.id] !== undefined
                      ? sortDrafts[a.id]
                      : a.featured_sort_order != null
                        ? String(a.featured_sort_order)
                        : ""
                  }
                  onChangeText={(t) => setSortDrafts((prev) => ({ ...prev, [a.id]: t }))}
                  keyboardType="number-pad"
                  placeholder="0"
                  placeholderTextColor={colors.textMuted}
                  style={{
                    marginTop: space.sm,
                    borderWidth: 1,
                    borderColor: colors.border,
                    borderRadius: radii.md,
                    paddingHorizontal: space.md,
                    paddingVertical: space.sm,
                    color: colors.text,
                  }}
                />
                <ButtonSecondary
                  title="Apply order"
                  onPress={() => saveSort(a.id, Boolean(a.is_featured))}
                  style={{ marginTop: space.sm, alignSelf: "flex-start" }}
                />
              </View>
            ) : null}
          </View>
        )}
      />
    </Screen>
  );
}
