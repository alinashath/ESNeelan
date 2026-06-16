import { useMemo, useState } from "react";
import { Alert, FlatList, Pressable, View } from "react-native";
import { router, type Href } from "expo-router";
import { useQueryClient } from "@tanstack/react-query";
import { Ionicons } from "@expo/vector-icons";
import { supabase } from "@/src/lib/supabase";
import { Screen } from "@/src/components/ui/Screen";
import { TextTitle } from "@/src/components/ui/TextTitle";
import { TextBody } from "@/src/components/ui/TextBody";
import { TextCaption } from "@/src/components/ui/TextCaption";
import { TextLabel } from "@/src/components/ui/TextLabel";
import { ButtonPrimary } from "@/src/components/ui/ButtonPrimary";
import { ButtonSecondary } from "@/src/components/ui/ButtonSecondary";
import { Chip } from "@/src/components/ui/Chip";
import { ChipRow } from "@/src/components/ui/ChipRow";
import { ManagedListToolbar } from "@/src/components/ui/ManagedListToolbar";
import { useAuth } from "@/src/providers/AuthProvider";
import { useAdminFeaturedArticlesList, type AdminFeaturedArticleListRow } from "@/src/data/featured-articles";
import { textMatchesQuery } from "@/src/lib/managed-list";
import { colors, radii, space } from "@/src/theme/tokens";

type StatusFilter = "all" | "draft" | "published";

export default function AdminFeaturedArticlesIndex() {
  const { profile } = useAuth();
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<StatusFilter>("all");

  const { data, isLoading, refetch, isRefetching } = useAdminFeaturedArticlesList({
    enabled: profile?.role === "admin",
  });

  const rows = data ?? [];

  const filtered = useMemo(() => {
    return rows.filter((r) => {
      if (status === "draft" && r.status !== "draft") return false;
      if (status === "published" && r.status !== "published") return false;
      const q = search.trim();
      if (!q) return true;
      return (
        textMatchesQuery(r.title, q) ||
        textMatchesQuery(r.slug, q) ||
        textMatchesQuery(r.excerpt, q)
      );
    });
  }, [rows, search, status]);

  async function removeArticle(row: AdminFeaturedArticleListRow) {
    Alert.alert("Delete article", `Remove “${row.title}”? This cannot be undone.`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          const { error } = await supabase.from("featured_articles").delete().eq("id", row.id);
          if (error) {
            Alert.alert("Error", error.message);
            return;
          }
          await refetch();
          qc.invalidateQueries({ queryKey: ["featured-articles"] });
        },
      },
    ]);
  }

  if (profile?.role !== "admin") {
    return (
      <Screen scroll>
        <TextTitle>Articles</TextTitle>
        <TextBody style={{ marginTop: space.lg }}>Admin only.</TextBody>
      </Screen>
    );
  }

  const filterSlot = (
    <View>
      <TextLabel style={{ marginBottom: space.sm }}>STATUS</TextLabel>
      <ChipRow>
        {(
          [
            ["all", "ALL"],
            ["draft", "DRAFT"],
            ["published", "LIVE"],
          ] as const
        ).map(([id, label]) => (
          <Chip
            key={id}
            title={label}
            appearance="outlined"
            selected={status === id}
            onPress={() => setStatus(id)}
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
            <TextTitle style={{ marginBottom: space.xs }}>Featured articles</TextTitle>
            <TextBody style={{ marginBottom: space.md, color: colors.textSecondary }}>
              Editorial stories on the home screen. Only admins can create or edit them.
            </TextBody>
            <ButtonPrimary
              title="New article"
              icon="add-outline"
              onPress={() => router.push("/admin/articles/new" as Href)}
              style={{ marginBottom: space.lg, alignSelf: "flex-start" }}
            />
            {isLoading ? <TextCaption style={{ marginBottom: space.md }}>Loading…</TextCaption> : null}
            <ManagedListToolbar
              search={search}
              onSearchChange={setSearch}
              searchPlaceholder="Search title or slug…"
              sortOptions={[{ id: "recent", label: "Recent updates" }]}
              sortId="recent"
              onSortChange={() => {}}
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
            No articles match your filters.
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
              gap: space.sm,
            }}
          >
            <Pressable
              onPress={() => router.push(`/admin/articles/${a.id}` as Href)}
              style={({ pressed }) => ({
                flexDirection: "row",
                alignItems: "flex-start",
                gap: space.sm,
                opacity: pressed ? 0.85 : 1,
              })}
            >
              <View style={{ flex: 1, minWidth: 0 }}>
                <TextBody style={{ fontWeight: "600" }} numberOfLines={2}>
                  {a.title}
                </TextBody>
                <TextCaption style={{ marginTop: 4, color: colors.textMuted }} numberOfLines={1}>
                  /{a.slug}
                </TextCaption>
                <TextCaption style={{ marginTop: 6, color: colors.primary, fontWeight: "600" }}>
                  {a.status === "published" ? "Live on home" : "Draft"}
                </TextCaption>
              </View>
              <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
            </Pressable>
            <View style={{ flexDirection: "row", gap: space.sm, flexWrap: "wrap" }}>
              <ButtonSecondary
                title="Preview"
                onPress={() => router.push(`/article/${encodeURIComponent(a.slug)}` as Href)}
              />
              <ButtonSecondary title="Delete" onPress={() => removeArticle(a)} />
            </View>
          </View>
        )}
      />
    </Screen>
  );
}
