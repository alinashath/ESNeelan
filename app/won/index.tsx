import { useMemo, useState } from "react";
import { FlatList, Image, Pressable, View } from "react-native";
import { router, type Href } from "expo-router";
import { useAuth } from "@/src/providers/AuthProvider";
import { useWonAuctions } from "@/src/data/user-auctions";
import { Screen } from "@/src/components/ui/Screen";
import { TextTitle } from "@/src/components/ui/TextTitle";
import { TextBody } from "@/src/components/ui/TextBody";
import { TextCaption } from "@/src/components/ui/TextCaption";
import { ButtonPrimary } from "@/src/components/ui/ButtonPrimary";
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

const STATUS_FILTER = ["all", "won", "paid", "completed"] as const;
type StatusFilter = (typeof STATUS_FILTER)[number];

export default function WonAuctionsListScreen() {
  const { session } = useAuth();
  const { data, refetch, isRefetching } = useWonAuctions();
  const [search, setSearch] = useState("");
  const [sortId, setSortId] = useState("updated");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");

  const rows = (data ?? []) as unknown as Row[];

  const filtered = useMemo(() => {
    let list = rows.filter((a) => {
      const st = String(a.status ?? "");
      if (statusFilter !== "all" && st !== statusFilter) return false;
      const title = String(a.title ?? "");
      const pay = String(a.payment_instructions ?? "");
      if (!search.trim()) return true;
      return textMatchesQuery(title, search) || textMatchesQuery(pay, search);
    });

    const dir: SortDir = sortId === "updated_asc" ? "asc" : "desc";
    const copy = [...list];
    if (sortId === "title_az") {
      copy.sort((a, b) =>
        compareStringsCaseInsensitive(String(a.title ?? ""), String(b.title ?? ""), "asc"),
      );
    } else if (sortId === "title_za") {
      copy.sort((a, b) =>
        compareStringsCaseInsensitive(String(a.title ?? ""), String(b.title ?? ""), "desc"),
      );
    } else if (sortId === "high_bid") {
      copy.sort(
        (a, b) =>
          Number(b.current_highest_bid ?? 0) - Number(a.current_highest_bid ?? 0),
      );
    } else {
      copy.sort((a, b) =>
        compareIsoDates(String(a.updated_at ?? ""), String(b.updated_at ?? ""), dir),
      );
    }
    return copy;
  }, [rows, search, sortId, statusFilter]);

  if (!session) {
    return (
      <Screen scroll>
        <TextTitle>Won auctions</TextTitle>
        <ButtonPrimary title="Log in" onPress={() => router.push("/(auth)/login")} />
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
            ["won", "WON"],
            ["paid", "PAID"],
            ["completed", "DONE"],
          ] as const
        ).map(([id, label]) => (
          <Chip
            key={id}
            title={label}
            appearance="outlined"
            selected={statusFilter === id}
            onPress={() => setStatusFilter(id)}
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
        keyExtractor={(item) => String(item.id)}
        refreshing={isRefetching}
        onRefresh={() => void refetch()}
        ListHeaderComponent={
          <>
            <TextTitle style={{ marginBottom: space.xs }}>Won auctions</TextTitle>
            <TextCaption style={{ marginBottom: space.md, color: colors.textSecondary }}>
              Tap a row for payment details and actions.
            </TextCaption>
            <ManagedListToolbar
              search={search}
              onSearchChange={setSearch}
              searchPlaceholder="Search title or payment notes…"
              sortOptions={[
                { id: "updated", label: "Recent update" },
                { id: "updated_asc", label: "Oldest update" },
                { id: "title_az", label: "Title A–Z" },
                { id: "title_za", label: "Title Z–A" },
                { id: "high_bid", label: "Highest bid" },
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
            No won auctions match your filters.
          </TextBody>
        }
        renderItem={({ item: a }) => {
          const img = a.image_url as string | null | undefined;
          return (
            <Pressable
              onPress={() => router.push(`/won/${String(a.id)}` as Href)}
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
                <TextCaption style={{ marginTop: 4 }}>{String(a.status)}</TextCaption>
              </View>
              <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
            </Pressable>
          );
        }}
      />
    </Screen>
  );
}
