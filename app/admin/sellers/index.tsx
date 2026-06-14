import { useMemo, useState } from "react";
import { FlatList, Pressable, View } from "react-native";
import { router, type Href } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/src/lib/supabase";
import { useAuth } from "@/src/providers/AuthProvider";
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

type PendingSeller = {
  id: string;
  display_name: string | null;
  phone: string | null;
  seller_applied_at: string | null;
};

function usePendingSellerApplications(enabled: boolean) {
  return useQuery({
    queryKey: ["admin", "pending-sellers"],
    enabled,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, display_name, phone, seller_applied_at")
        .eq("seller_verification_status", "pending")
        .order("seller_applied_at", { ascending: true });
      if (error) throw error;
      return (data ?? []) as PendingSeller[];
    },
  });
}

export default function AdminSellersListScreen() {
  const { profile } = useAuth();
  const isAdmin = profile?.role === "admin";
  const { data, refetch, isRefetching } = usePendingSellerApplications(isAdmin);
  const [search, setSearch] = useState("");
  const [sortId, setSortId] = useState("oldest");

  const rows = data ?? [];

  const filtered = useMemo(() => {
    const list = rows.filter((u) => {
      const blob = `${u.display_name ?? ""} ${u.phone ?? ""}`;
      return textMatchesQuery(blob, search);
    });
    const dir: SortDir = sortId === "newest" ? "desc" : "asc";
    const copy = [...list];
    if (sortId === "name_az") {
      copy.sort((a, b) =>
        compareStringsCaseInsensitive(
          String(a.display_name ?? ""),
          String(b.display_name ?? ""),
          "asc",
        ),
      );
    } else if (sortId === "name_za") {
      copy.sort((a, b) =>
        compareStringsCaseInsensitive(
          String(a.display_name ?? ""),
          String(b.display_name ?? ""),
          "desc",
        ),
      );
    } else {
      copy.sort((a, b) =>
        compareIsoDates(
          String(a.seller_applied_at ?? ""),
          String(b.seller_applied_at ?? ""),
          dir,
        ),
      );
    }
    return copy;
  }, [rows, search, sortId]);

  if (!isAdmin) {
    return (
      <Screen scroll>
        <TextTitle>Sellers</TextTitle>
        <TextBody style={{ marginTop: space.lg }}>Admin only.</TextBody>
      </Screen>
    );
  }

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
            <TextTitle style={{ marginBottom: space.xs }}>Seller applications</TextTitle>
            <TextCaption style={{ marginBottom: space.md, color: colors.textSecondary }}>
              Tap a row to review and approve or reject.
            </TextCaption>
            <ManagedListToolbar
              search={search}
              onSearchChange={setSearch}
              searchPlaceholder="Search name or phone…"
              sortOptions={[
                { id: "oldest", label: "Queue (oldest first)" },
                { id: "newest", label: "Newest first" },
                { id: "name_az", label: "Name A–Z" },
                { id: "name_za", label: "Name Z–A" },
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
            No pending applications.
          </TextBody>
        }
        renderItem={({ item: u }) => (
          <Pressable
            onPress={() => router.push(`/admin/sellers/${u.id}` as Href)}
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
            <View style={{ flex: 1, minWidth: 0 }}>
              <TextBody style={{ fontWeight: "600" }} numberOfLines={1}>
                {u.display_name ?? "—"}
              </TextBody>
              <TextCaption style={{ marginTop: 4 }}>{u.phone ?? ""}</TextCaption>
              <TextCaption style={{ marginTop: 2 }}>
                Applied: {u.seller_applied_at ? new Date(u.seller_applied_at).toLocaleString() : "—"}
              </TextCaption>
            </View>
            <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
          </Pressable>
        )}
      />
    </Screen>
  );
}
