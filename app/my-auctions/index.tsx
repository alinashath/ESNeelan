import { useMemo, useState } from "react";
import { FlatList, Image, Pressable, View } from "react-native";
import { router, type Href } from "expo-router";
import { useAuth } from "@/src/providers/AuthProvider";
import { useMyAuctions } from "@/src/data/user-auctions";
import { Screen } from "@/src/components/ui/Screen";
import { TextTitle } from "@/src/components/ui/TextTitle";
import { TextBody } from "@/src/components/ui/TextBody";
import { TextCaption } from "@/src/components/ui/TextCaption";
import { ButtonPrimary } from "@/src/components/ui/ButtonPrimary";
import { ManagedListToolbar } from "@/src/components/ui/ManagedListToolbar";
import { Chip } from "@/src/components/ui/Chip";
import { ChipRow } from "@/src/components/ui/ChipRow";
import { TextLabel } from "@/src/components/ui/TextLabel";
import { compareIsoDates,
  compareStringsCaseInsensitive,
  textMatchesQuery,
  type SortDir,
} from "@/src/lib/managed-list";
import { auctionDetailStatusText } from "@/src/lib/auction-live";
import { colors, radii, space } from "@/src/theme/tokens";
import { Ionicons } from "@expo/vector-icons";

type Row = Record<string, unknown> & { id: string };

const STATUS_FILTER = ["all", "draft", "pending_approval", "active", "won", "other"] as const;
type StatusFilter = (typeof STATUS_FILTER)[number];

function statusBucket(status: string): Exclude<StatusFilter, "all"> {
  if (status === "draft") return "draft";
  if (status === "pending_approval") return "pending_approval";
  if (status === "active") return "active";
  if (status === "won" || status === "paid") return "won";
  return "other";
}

export default function MyAuctionsListScreen() {
  const { session } = useAuth();
  const { data, refetch, isRefetching } = useMyAuctions();
  const [search, setSearch] = useState("");
  const [sortId, setSortId] = useState("newest");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");

  const rows = (data ?? []) as unknown as Row[];

  const filtered = useMemo(() => {
    let list = rows.filter((a) => {
      const st = String(a.status ?? "");
      if (statusFilter !== "all" && statusBucket(st) !== statusFilter) return false;
      const title = String(a.title ?? "");
      const desc = String(a.description ?? "");
      const q = search.trim();
      if (!q) return true;
      return textMatchesQuery(title, q) || textMatchesQuery(desc, q);
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
    } else if (sortId === "status") {
      copy.sort((a, b) =>
        compareStringsCaseInsensitive(String(a.status ?? ""), String(b.status ?? ""), "asc"),
      );
    } else {
      copy.sort((a, b) =>
        compareIsoDates(String(a.created_at ?? ""), String(b.created_at ?? ""), dir),
      );
    }
    return copy;
  }, [rows, search, sortId, statusFilter]);

  if (!session) {
    return (
      <Screen scroll>
        <TextTitle>My auctions</TextTitle>
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
            ["draft", "DRAFT"],
            ["pending_approval", "PENDING"],
            ["active", "Live"],
            ["won", "WON / PAID"],
            ["other", "CLOSED"],
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
            <TextTitle style={{ marginBottom: space.xs }}>My auctions</TextTitle>
            <TextCaption style={{ marginBottom: space.md, color: colors.textSecondary }}>
              Drafts, pending approval, and live listings. Tap a row for details.
            </TextCaption>
            <ManagedListToolbar
              search={search}
              onSearchChange={setSearch}
              searchPlaceholder="Search title or description…"
              sortOptions={[
                { id: "newest", label: "Newest" },
                { id: "oldest", label: "Oldest" },
                { id: "title_az", label: "Title A–Z" },
                { id: "title_za", label: "Title Z–A" },
                { id: "status", label: "Status" },
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
        renderItem={({ item: a }) => {
          const img = a.image_url as string | null | undefined;
          return (
            <Pressable
              onPress={() => router.push(`/my-auctions/${String(a.id)}` as Href)}
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
                backgroundColor: colors.background,
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
                <TextCaption style={{ marginTop: 4, textTransform: "uppercase" }}>
                  {auctionDetailStatusText(String(a.status), String(a.ends_at ?? ""))}
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
