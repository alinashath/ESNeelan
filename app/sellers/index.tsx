import {
  ActivityIndicator,
  Image,
  Pressable,
  ScrollView,
  Text,
  View,
} from "react-native";
import { router } from "expo-router";
import { useSellersRankedByActiveListings } from "@/src/data/sellers";
import { Screen } from "@/src/components/ui/Screen";
import { ListEmptyState } from "@/src/components/ui/ListEmptyState";
import { colors, fontFamilies, space } from "@/src/theme/tokens";

const AVATAR = 48;

export default function SellersIndexScreen() {
  const { data: sellers, isLoading, isError, refetch } = useSellersRankedByActiveListings();

  const rows = sellers ?? [];

  return (
    <Screen scroll={false}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          padding: space.lg,
          paddingBottom: space.xxl,
          maxWidth: 560,
          alignSelf: "center",
          width: "100%",
        }}
      >
        <Text
          style={{
            fontFamily: fontFamilies.body,
            fontSize: 12,
            lineHeight: 17,
            color: colors.textMuted,
            marginBottom: space.lg,
          }}
        >
          Sellers are ranked by how many live auctions they currently have. Tap a row to open their
          storefront.
        </Text>

        {isLoading ? (
          <View style={{ paddingVertical: space.xxl, alignItems: "center" }}>
            <ActivityIndicator color={colors.primary} accessibilityLabel="Loading sellers" />
          </View>
        ) : null}

        {isError ? (
          <ListEmptyState
            icon="alert-circle-outline"
            title="Couldn’t load sellers"
            description="Check your connection and try again."
            actionLabel="Retry"
            onActionPress={() => void refetch()}
          />
        ) : null}

        {!isLoading && !isError && rows.length === 0 ? (
          <ListEmptyState
            icon="people-outline"
            title="No sellers with live listings"
            description="When auctions go live, sellers will appear here."
            actionLabel="Browse home"
            onActionPress={() => router.push("/(tabs)")}
          />
        ) : null}

        {!isLoading && !isError
          ? rows.map((s) => {
              const label = (s.display_name?.trim() || "Seller").trim();
              const initial = (label[0] ?? "?").toUpperCase();
              return (
                <Pressable
                  key={s.id}
                  onPress={() => router.push(`/seller/${s.id}`)}
                  accessibilityRole="link"
                  accessibilityLabel={`${label}, ${s.active_listing_count} live listings`}
                  style={({ pressed }) => ({
                    flexDirection: "row",
                    alignItems: "center",
                    gap: space.md,
                    paddingVertical: space.md,
                    borderBottomWidth: 1,
                    borderBottomColor: colors.hairlineSoft,
                    opacity: pressed ? 0.85 : 1,
                  })}
                >
                  <View
                    style={{
                      width: AVATAR,
                      height: AVATAR,
                      borderRadius: AVATAR / 2,
                      overflow: "hidden",
                      backgroundColor: colors.accentMuted,
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    {s.avatar_url ? (
                      <Image
                        source={{ uri: s.avatar_url }}
                        style={{ width: AVATAR, height: AVATAR }}
                        resizeMode="cover"
                        accessibilityIgnoresInvertColors
                      />
                    ) : (
                      <Text
                        style={{
                          fontFamily: fontFamilies.bodySemiBold,
                          fontSize: 18,
                          color: colors.primary,
                        }}
                      >
                        {initial}
                      </Text>
                    )}
                  </View>
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Text
                      numberOfLines={2}
                      style={{
                        fontFamily: fontFamilies.bodySemiBold,
                        fontSize: 15,
                        lineHeight: 20,
                        color: colors.primary,
                        textDecorationLine: "underline",
                      }}
                    >
                      {label}
                    </Text>
                    <Text
                      style={{
                        marginTop: 2,
                        fontFamily: fontFamilies.body,
                        fontSize: 12,
                        color: colors.textMuted,
                      }}
                    >
                      {s.active_listing_count} live{" "}
                      {s.active_listing_count === 1 ? "listing" : "listings"}
                    </Text>
                  </View>
                  <Text
                    style={{
                      fontFamily: fontFamilies.bodyMedium,
                      fontSize: 12,
                      color: colors.textMuted,
                    }}
                  >
                    →
                  </Text>
                </Pressable>
              );
            })
          : null}
      </ScrollView>
    </Screen>
  );
}
