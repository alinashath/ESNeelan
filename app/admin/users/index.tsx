import { useMemo, useState } from "react";
import { FlatList, Pressable, View } from "react-native";
import { router, type Href } from "expo-router";
import { useAuth } from "@/src/providers/AuthProvider";
import { useAdminUsers } from "@/src/data/user-auctions";
import { Screen } from "@/src/components/ui/Screen";
import { TextTitle } from "@/src/components/ui/TextTitle";
import { TextBody } from "@/src/components/ui/TextBody";
import { TextCaption } from "@/src/components/ui/TextCaption";
import { ManagedListToolbar } from "@/src/components/ui/ManagedListToolbar";
import { Chip } from "@/src/components/ui/Chip";
import { ChipRow } from "@/src/components/ui/ChipRow";
import { TextLabel } from "@/src/components/ui/TextLabel";
import {
  compareIsoDates,
  compareStringsCaseInsensitive,
  textMatchesQuery,
  type SortDir,
} from "@/src/lib/managed-list";
import { colors, radii, space } from "@/src/theme/tokens";
import { Ionicons } from "@expo/vector-icons";

type Row = Record<string, unknown> & { id: string };

export default function AdminUsersListScreen() {
  const { profile } = useAuth();
  const isAdmin = profile?.role === "admin";
  const { data, refetch, isRefetching } = useAdminUsers({ enabled: isAdmin });
  const [search, setSearch] = useState("");
  const [sortId, setSortId] = useState("newest");
  const [roleFilter, setRoleFilter] = useState<"all" | "admin" | "buyer" | "seller">("all");
  const [suspFilter, setSuspFilter] = useState<"all" | "active" | "suspended">("all");

  const rows = (data ?? []) as Row[];

  const filtered = useMemo(() => {
    const list = rows.filter((u) => {
      const role = String(u.role ?? "");
      if (roleFilter !== "all" && role !== roleFilter) return false;
      const susp = u.suspended_at != null;
      if (suspFilter === "active" && susp) return false;
      if (suspFilter === "suspended" && !susp) return false;
      const blob = `${u.display_name ?? ""} ${u.phone ?? ""} ${role}`;
      return textMatchesQuery(blob, search);
    });

    const dir: SortDir = sortId === "oldest" ? "asc" : "desc";
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
        compareIsoDates(String(a.created_at ?? ""), String(b.created_at ?? ""), dir),
      );
    }
    return copy;
  }, [rows, search, sortId, roleFilter, suspFilter]);

  if (!isAdmin) {
    return (
      <Screen scroll>
        <TextTitle>Users</TextTitle>
        <TextBody style={{ marginTop: space.lg }}>Admin only.</TextBody>
      </Screen>
    );
  }

  const filterSlot = (
    <View style={{ gap: space.md }}>
      <View>
        <TextLabel style={{ marginBottom: space.sm }}>ROLE</TextLabel>
        <ChipRow>
          {(
            [
              ["all", "ALL"],
              ["admin", "ADMIN"],
              ["seller", "SELLER"],
              ["buyer", "BUYER"],
            ] as const
          ).map(([id, label]) => (
            <Chip
              key={id}
              title={label}
              appearance="outlined"
              selected={roleFilter === id}
              onPress={() => setRoleFilter(id)}
            />
          ))}
        </ChipRow>
      </View>
      <View>
        <TextLabel style={{ marginBottom: space.sm }}>ACCOUNT</TextLabel>
        <ChipRow>
          {(
            [
              ["all", "ALL"],
              ["active", "ACTIVE"],
              ["suspended", "SUSPENDED"],
            ] as const
          ).map(([id, label]) => (
            <Chip
              key={id}
              title={label}
              appearance="outlined"
              selected={suspFilter === id}
              onPress={() => setSuspFilter(id)}
            />
          ))}
        </ChipRow>
      </View>
    </View>
  );

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
            <TextTitle style={{ marginBottom: space.xs }}>Users</TextTitle>
            <TextCaption style={{ marginBottom: space.md, color: colors.textSecondary }}>
              Tap a row for full profile and suspend controls.
            </TextCaption>
            <ManagedListToolbar
              search={search}
              onSearchChange={setSearch}
              searchPlaceholder="Search name, phone, role…"
              sortOptions={[
                { id: "newest", label: "Newest" },
                { id: "oldest", label: "Oldest" },
                { id: "name_az", label: "Name A–Z" },
                { id: "name_za", label: "Name Z–A" },
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
            No users match your filters.
          </TextBody>
        }
        renderItem={({ item: u }) => (
          <Pressable
            onPress={() => router.push(`/admin/users/${String(u.id)}` as Href)}
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
                {String(u.display_name ?? "—")}
              </TextBody>
              <TextCaption style={{ marginTop: 4 }} numberOfLines={1}>
                {String(u.phone ?? "")} · {String(u.role)}
              </TextCaption>
              <TextCaption style={{ marginTop: 2 }}>
                {u.suspended_at ? "Suspended" : "Active"}
              </TextCaption>
            </View>
            <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
          </Pressable>
        )}
      />
    </Screen>
  );
}
