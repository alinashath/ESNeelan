import { useMemo, useState } from "react";
import { FlatList, Image, Pressable, View } from "react-native";
import { router, type Href } from "expo-router";
import { useAwaitingPaymentAuctions } from "@/src/data/user-auctions";
import { Screen } from "@/src/components/ui/Screen";
import { TextTitle } from "@/src/components/ui/TextTitle";
import { TextBody } from "@/src/components/ui/TextBody";
import { TextCaption } from "@/src/components/ui/TextCaption";
import { SearchField } from "@/src/components/ui/SearchField";
import { textMatchesQuery } from "@/src/lib/managed-list";
import { colors, radii, space } from "@/src/theme/tokens";
import { Ionicons } from "@expo/vector-icons";

type Row = Record<string, unknown> & { id: string };

export default function AdminAwaitingPaymentScreen() {
  const { data, refetch, isRefetching } = useAwaitingPaymentAuctions();
  const [search, setSearch] = useState("");

  const rows = (data ?? []) as unknown as Row[];
  const filtered = useMemo(() => {
    if (!search.trim()) return rows;
    return rows.filter((a) => textMatchesQuery(String(a.title ?? ""), search));
  }, [rows, search]);

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
            <TextTitle style={{ marginBottom: space.xs }}>Featured fee verification</TextTitle>
            <TextCaption style={{ marginBottom: space.md, color: colors.textSecondary }}>
              New listings awaiting fee proof before going live, and live listings where the seller requested the
              featured tier. Verify payment in the detail screen.
            </TextCaption>
            <SearchField
              placeholder="Search title…"
              value={search}
              onChangeText={setSearch}
              autoCorrect={false}
              autoCapitalize="none"
            />
          </>
        }
        contentContainerStyle={{
          paddingHorizontal: space.lg,
          paddingBottom: space.xxl,
        }}
        ListEmptyComponent={
          <TextBody style={{ color: colors.textMuted, marginTop: space.lg }}>No listings awaiting fee.</TextBody>
        }
        renderItem={({ item: a }) => {
          const img = a.image_url as string | null | undefined;
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
                  {(a.seller_display_name as string | null) ?? "Seller"}
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
