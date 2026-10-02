import { useCallback, useLayoutEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  RefreshControl,
  View,
} from "react-native";
import { ContainedListingPhoto } from "@/src/components/ui/ContainedListingPhoto";
import { useLocalSearchParams, useNavigation, useFocusEffect, router, type Href } from "expo-router";
import { useQueryClient } from "@tanstack/react-query";
import { Screen } from "@/src/components/ui/Screen";
import { TextTitle } from "@/src/components/ui/TextTitle";
import { TextBody } from "@/src/components/ui/TextBody";
import { TextCaption } from "@/src/components/ui/TextCaption";
import { Badge } from "@/src/components/ui/Badge";
import { AuctionCard } from "@/src/components/ui/AuctionCard";
import { ButtonSecondary } from "@/src/components/ui/ButtonSecondary";
import { ListEmptyState } from "@/src/components/ui/ListEmptyState";
import {
  recordSellerCollectionView,
  useSellerCollectionDetail,
} from "@/src/data/seller-collections";
import { adminDeleteSellerCollection } from "@/src/data/admin-content";
import { confirmAction } from "@/src/lib/confirm-action";
import { useAuth } from "@/src/providers/AuthProvider";
import { useScreenContentWidth } from "@/src/components/layout/content-width";
import { layout } from "@/src/theme/layout";
import { colors, radii, space } from "@/src/theme/tokens";

export default function PublicCollectionScreen() {
  const navigation = useNavigation();
  const { profile } = useAuth();
  const qc = useQueryClient();
  const params = useLocalSearchParams<{ id: string | string[] }>();
  const id =
    typeof params.id === "string" ? params.id : Array.isArray(params.id) ? (params.id[0] ?? "") : "";
  const recordedViewForId = useRef<string | null>(null);
  const [adminDeleting, setAdminDeleting] = useState(false);

  const screenW = useScreenContentWidth();
  const storeW = Math.min(screenW, layout.articleReadingMaxWidth);
  const gap = space.md;
  const paddingH = space.lg;
  const listInnerW = Math.max(0, storeW - paddingH * 2);
  const numColumns = listInnerW >= 480 ? 2 : 1;
  const colW = (listInnerW - gap * Math.max(0, numColumns - 1)) / Math.max(1, numColumns);
  const multiCol = numColumns > 1;

  const { data, isPending, isError, refetch, isRefetching } = useSellerCollectionDetail(id || undefined);

  useFocusEffect(
    useCallback(() => {
      void refetch();
      if (id && recordedViewForId.current !== id) {
        recordedViewForId.current = id;
        void recordSellerCollectionView(id);
      }
    }, [refetch, id]),
  );

  const title = data?.name?.trim() || "Event";

  useLayoutEffect(() => {
    navigation.setOptions({ title });
  }, [navigation, title]);

  async function adminRemoveCollection() {
    if (!id || profile?.role !== "admin" || !data) return;
    const ok = await confirmAction({
      title: "Delete collection",
      message: `Permanently delete “${data.name}”? This cannot be undone.`,
      confirmLabel: "Delete",
      cancelLabel: "Cancel",
      destructive: true,
    });
    if (!ok) return;

    setAdminDeleting(true);
    try {
      await adminDeleteSellerCollection(id);
      await Promise.all([
        qc.invalidateQueries({ queryKey: ["seller-collections"] }),
        qc.invalidateQueries({ queryKey: ["admin", "seller-collections-featured"] }),
      ]);
      router.replace("/(tabs)/collections" as Href);
    } catch (e: unknown) {
      Alert.alert("Error", e instanceof Error ? e.message : "Could not delete collection.");
    } finally {
      setAdminDeleting(false);
    }
  }

  const header = data ? (
    <View style={{ marginBottom: space.lg }}>
      {data.cover_url ? (
        <ContainedListingPhoto
          uri={data.cover_url}
          height={180}
          borderRadius={radii.lg}
          showBorder={false}
          style={{ marginBottom: space.md }}
        />
      ) : null}
      <View style={{ flexDirection: "row", flexWrap: "wrap", alignItems: "center", gap: space.sm }}>
        <TextTitle style={{ letterSpacing: -0.3, flexShrink: 1 }}>{data.name}</TextTitle>
        {data.is_featured ? <Badge title="FEATURED" variant="accent" compact /> : null}
      </View>
      {data.description.trim() ? (
        <TextBody style={{ marginTop: space.sm, color: colors.textSecondary, lineHeight: 22 }}>
          {data.description.trim()}
        </TextBody>
      ) : null}
      {profile?.role === "admin" ? (
        <View
          style={{
            marginTop: space.md,
            padding: space.md,
            borderWidth: 1,
            borderColor: colors.border,
            borderRadius: radii.md,
            backgroundColor: colors.white,
            gap: space.sm,
          }}
        >
          <TextCaption style={{ color: colors.textMuted, letterSpacing: 0.6 }}>ADMIN</TextCaption>
          <ButtonSecondary
            title={adminDeleting ? "Deleting…" : "Delete collection"}
            icon="trash-outline"
            disabled={adminDeleting}
            onPress={() => void adminRemoveCollection()}
            style={{ alignSelf: "flex-start" }}
          />
        </View>
      ) : null}
    </View>
  ) : null;

  const rows = data?.items ?? [];

  if (!id) {
    return (
      <Screen scroll>
        <TextBody>Invalid link.</TextBody>
      </Screen>
    );
  }

  if (isError) {
    return (
      <Screen scroll>
        <TextTitle>Event</TextTitle>
        <TextBody style={{ marginTop: space.md }}>This event is unavailable.</TextBody>
      </Screen>
    );
  }

  if (isPending && !data) {
    return (
      <Screen scroll>
        <ActivityIndicator color={colors.primary} style={{ marginTop: space.xl }} />
      </Screen>
    );
  }

  if (!data) {
    return (
      <Screen scroll>
        <TextTitle>Not found</TextTitle>
        <TextBody style={{ marginTop: space.md }}>This event does not exist or is private.</TextBody>
      </Screen>
    );
  }

  const listEmpty =
    rows.length === 0 ? (
      <ListEmptyState
        icon="albums-outline"
        title="No public listings yet"
        description="No visible listings have been added to this event yet."
      />
    ) : null;

  return (
    <Screen scroll={false} noPadding style={{ backgroundColor: colors.background }}>
      <View style={{ flex: 1, width: "100%", alignItems: "center" }}>
        <View style={{ flex: 1, width: "100%", maxWidth: layout.articleReadingMaxWidth }}>
          <FlatList
            showsVerticalScrollIndicator={false}
            data={rows}
            keyExtractor={(item) => item.id}
            key={`collection-${numColumns}`}
            numColumns={numColumns}
            columnWrapperStyle={multiCol ? { gap } : undefined}
            ListHeaderComponent={header}
            ListEmptyComponent={listEmpty}
            refreshControl={
              <RefreshControl refreshing={isRefetching} onRefresh={() => void refetch()} tintColor={colors.primary} />
            }
            contentContainerStyle={{
              flexGrow: 1,
              paddingHorizontal: paddingH,
              paddingTop: space.lg,
              paddingBottom: space.xxl,
            }}
            renderItem={({ item }) => (
              <View style={multiCol ? { width: colW, marginBottom: gap } : undefined}>
                <AuctionCard
                  auction={{
                    id: item.id,
                    title: item.title,
                    status: item.status,
                    ends_at: item.ends_at,
                    current_highest_bid: item.current_highest_bid,
                    starting_price: item.starting_price,
                    bid_count: item.bid_count,
                    image_url: item.image_url,
                    description: "",
                  }}
                  compact={multiCol}
                  inGrid={multiCol}
                  href={`/auction/${item.id}`}
                />
              </View>
            )}
          />
        </View>
      </View>
    </Screen>
  );
}
