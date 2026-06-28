import { useCallback } from "react";
import {
  ActivityIndicator,
  Image,
  Pressable,
  ScrollView,
  Text,
  View,
} from "react-native";
import { router, useFocusEffect, type Href } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import {
  usePublishedFeaturedArticlesForHome,
  type FeaturedArticleListItem,
} from "@/src/data/featured-articles";
import { TextSectionTitle } from "@/src/components/ui/TextSectionTitle";
import { TextCaption } from "@/src/components/ui/TextCaption";
import { colors, fontFamilies, radii, space } from "@/src/theme/tokens";

export function HomeFeaturedArticles() {
  const { data, isLoading, refetch } = usePublishedFeaturedArticlesForHome();

  const list: FeaturedArticleListItem[] = Array.isArray(data) ? data : [];

  useFocusEffect(
    useCallback(() => {
      void refetch();
    }, [refetch]),
  );

  if (isLoading && list.length === 0) {
    return (
      <View style={{ marginTop: space.xl, paddingVertical: space.lg, alignItems: "center" }}>
        <ActivityIndicator color={colors.accent} accessibilityLabel="Loading articles" />
      </View>
    );
  }

  if (!list.length) return null;

  return (
    <View style={{ marginTop: space.xl }}>
      <View
        style={{
          paddingHorizontal: space.lg,
          marginBottom: space.md,
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          gap: space.md,
        }}
      >
        <TextSectionTitle>Stories</TextSectionTitle>
        <Pressable
          onPress={() => router.push("/(tabs)/artists" as Href)}
          accessibilityRole="button"
          accessibilityLabel="View all artist stories"
          style={({ pressed }) => ({
            flexDirection: "row",
            alignItems: "center",
            gap: 4,
            opacity: pressed ? 0.85 : 1,
          })}
        >
          <Text
            style={{
              fontFamily: fontFamilies.bodySemiBold,
              fontWeight: "600",
              fontSize: 14,
              color: colors.primary,
            }}
          >
            ALL STORIES
          </Text>
          <Ionicons name="chevron-forward" size={18} color={colors.primary} />
        </Pressable>
      </View>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: space.lg, gap: space.md, paddingBottom: 4 }}
      >
        {list.map((a, index) => {
          const lead = index === 0;
          const cardW = lead ? 300 : 260;
          const imgH = lead ? 140 : 120;
          const titleSize = lead ? 18 : 17;
          const titleLh = lead ? 24 : 22;
          return (
          <Pressable
            key={a.id}
            onPress={() => router.push(`/article/${encodeURIComponent(a.slug)}` as Href)}
            style={({ pressed }) => ({
              width: cardW,
              borderRadius: radii.md,
              borderWidth: lead ? 0 : 1,
              borderColor: colors.border,
              backgroundColor: colors.background,
              overflow: "hidden",
              opacity: pressed ? 0.92 : 1,
              ...(lead
                ? {
                    shadowColor: "#000000",
                    shadowOffset: { width: 0, height: 4 },
                    shadowOpacity: 0.08,
                    shadowRadius: 12,
                    elevation: 4,
                  }
                : {}),
            })}
          >
            {a.cover_display_url ? (
              <Image
                source={{ uri: a.cover_display_url }}
                style={{ width: "100%", height: imgH, backgroundColor: colors.surfaceMuted }}
                resizeMode="cover"
              />
            ) : (
              <View
                style={{
                  height: imgH,
                  backgroundColor: colors.accentTint,
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Ionicons name="color-palette-outline" size={lead ? 40 : 36} color={colors.primary} />
              </View>
            )}
            <View style={{ padding: space.md }}>
              {lead ? (
                <TextCaption
                  style={{
                    marginBottom: space.xs,
                    fontWeight: "700",
                    letterSpacing: 0.8,
                    color: colors.accent,
                    fontSize: 10,
                  }}
                >
                  SPOTLIGHT
                </TextCaption>
              ) : null}
              <Text
                numberOfLines={2}
                style={{
                  fontFamily: fontFamilies.headingSerif,
                  fontSize: titleSize,
                  lineHeight: titleLh,
                  fontWeight: "600",
                  color: colors.text,
                }}
              >
                {a.title}
              </Text>
              {a.excerpt ? (
                <TextCaption numberOfLines={3} style={{ marginTop: space.xs, lineHeight: 18 }}>
                  {a.excerpt}
                </TextCaption>
              ) : null}
              <View
                style={{
                  marginTop: space.sm,
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 4,
                }}
              >
                <Text
                  style={{
                    fontFamily: fontFamilies.bodySemiBold,
                    fontWeight: "600",
                    fontSize: 12,
                    color: colors.primary,
                  }}
                >
                  Read
                </Text>
                <Ionicons name="arrow-forward" size={14} color={colors.primary} />
              </View>
            </View>
          </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}
