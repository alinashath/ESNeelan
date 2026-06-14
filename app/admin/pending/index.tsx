import { useMemo, useState } from "react";
import { FlatList, Image, Pressable, View } from "react-native";
import { router, type Href } from "expo-router";
import { usePendingApprovals } from "@/src/data/user-auctions";
import { Screen } from "@/src/components/ui/Screen";
import { TextTitle } from "@/src/components/ui/TextTitle";
import { TextBody } from "@/src/components/ui/TextBody";
import { TextCaption } from "@/src/components/ui/TextCaption";
import { ManagedListToolbar } from "@/src/components/ui/ManagedListToolbar";
import {
  compareIsoDates,
  compareStringsCaseInsensitive,
  textMatchesQuery,
  type SortDir,
} from "@/src/lib/managed-list";
import { colors, radii, space } from "@/src/theme/tokens";
import { Ionicons } from "@expo/vector-icons";

type Row = Record<string, unknown> & { id: string };

export default function AdminPendingListScreen() {
  const { data, refetch, isRefetching } = usePendingApprovals();
  const [search, setSearch] = useState("");
  const [sortId, setSortId] = useState("oldest");

  const rows = (data ?? []) as unknown as Row[];

  const filtered = useMemo(() => {
    const list = rows.filter((a) => {
      const title = String(a.title ?? "");
      const seller = String(a.seller_display_name ?? "");
      const sid = String(a.seller_id ?? "");
      if (!search.trim()) return true;
      return (
        textMatchesQuery(title, search) ||
        textMatchesQuery(seller, search) ||
        textMatchesQuery(sid, search)
      );
    });

    const dir: SortDir = sortId === "oldest" ? "asc" : "desc";
    const copy = [...list];
    if (sortId === "title_az") {
      copy.sort((a, b) =>
        compareStringsCaseInsensitive(String(a.title ?? ""), String(b.title ?? ""), "asc"),
      );
    } else if (sortId === "title_za") {
      copy.sort((a, b) =>
        compareStringsCaseInsensitive(String(a.title ?? ""), String(b.title ?? ""), "desc"),
      );
    } else if (sortId === "seller") {
      copy.sort((a, b) =>
        compareStringsCaseInsensitive(
          String(a.seller_display_name ?? ""),
          String(b.seller_display_name ?? ""),
          "asc",
        ),
      );
    } else {
      copy.sort((a, b) =>
        compareIsoDates(String(a.created_at ?? ""), String(b.created_at ?? ""), dir),
      );
    }
    return copy;
  }, [rows, search, sortId]);

  return (
    <Screen scroll={false}>
      <FlatList
        showsVerticalScrollIndicator={false}
        showsHorizontalScrollIndicator={false}
        data={filtered}
        keyExtractor={(item) => String(item.id)}
        refreshing={isRefetching}
        onRefresh={() => void refetch()}
        ListHeaderComponent={
          <>
            <TextTitle style={{ marginBottom: space.xs }}>Pending approval</TextTitle>
            <TextCaption style={{ marginBottom: space.md, color: colors.textSecondary }}>
              Tap a row to review details, approve, or reject.
            </TextCaption>
            <ManagedListToolbar
              search={search}
              onSearchChange={setSearch}
              searchPlaceholder="Search title or seller…"
              sortOptions={[
                { id: "oldest", label: "Queue (oldest first)" },
                { id: "newest", label: "Newest first" },
                { id: "title_az", label: "Title A–Z" },
                { id: "title_za", label: "Title Z–A" },
                { id: "seller", label: "Seller A–Z" },
              ]}
              sortId={sortId}
              onSortChange={setSortId}
            />
          </>
        }
        contentContainerStyle={{
          paddingHorizontal: space.lg,
          paddingBottom: space.xxl,
        }}
        ListEmptyComponent={
          <TextBody style={{ color: colors.textMuted, marginTop: space.lg }}>
            No pending listings.
          </TextBody>
        }
        renderItem={({ item: a }) => {
          const img = a.image_url as string | null | undefined;
          const sellerName = (a.seller_display_name as string | null | undefined) ?? null;
          return (
            <Pressable
              onPress={() => router.push(`/admin/pending/${String(a.id)}` as Href)}
              style={({ pressed }) => ({
                flexDirection: "row",
                alignItems: "center",
                gap: space.md,
                borderWidth: 1,
                borderColor: colors.border,
                borderRadius: radii.lg,
                padding: space.md,
                marginBottom: space.sm,
                opacity: pressed ? 0.92 : 1,
              })}
            >
              {img ? (
                <Image
                  source={{ uri: img }}
                  style={{
                    width: 56,
                    height: 56,
                    borderRadius: radii.md,
                    backgroundColor: colors.surfaceMuted,
                  }}
                />
              ) : (
                <View
                  style={{
                    width: 56,
                    height: 56,
                    borderRadius: radii.md,
                    backgroundColor: colors.surfaceMuted,
                  }}
                />
              )}
              <View style={{ flex: 1, minWidth: 0 }}>
                <TextBody style={{ fontWeight: "600" }} numberOfLines={2}>
                  {String(a.title)}
                </TextBody>
                <TextCaption style={{ marginTop: 4 }} numberOfLines={1}>
                  {sellerName ? sellerName : `Seller ${String(a.seller_id).slice(0, 8)}…`}
                </TextCaption>
              </View>
              <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
            </Pressable>
          );
        }}
      />
    </Screen>
  );
}
