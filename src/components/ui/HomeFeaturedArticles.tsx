import { useCallback } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  Text,
  View,
} from "react-native";
import { ContainedListingPhoto } from "@/src/components/ui/ContainedListingPhoto";
import { router, useFocusEffect, type Href } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import {
  usePublishedFeaturedArticlesForHome,
  type FeaturedArticleListItem,
} from "@/src/data/featured-articles";
import { TextSectionTitle } from "@/src/components/ui/TextSectionTitle";
import { TextCaption } from "@/src/components/ui/TextCaption";
import { colors, fontFamilies, radii, space } from "@/src/theme/tokens";

/** Uniform story card chrome — every tile same width and total height. */
const STORY_CARD_W = 280;
const STORY_IMG_H = 140;
const STORY_BODY_H = 176;
const STORY_TITLE_LH = 22;
const STORY_TITLE_LINES = 2;
const STORY_EXCERPT_LH = 18;
const STORY_EXCERPT_LINES = 3;
const STORY_SPOTLIGHT_H = 14;

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
          return (
          <Pressable
            key={a.id}
            onPress={() => router.push(`/article/${encodeURIComponent(a.slug)}` as Href)}
            style={({ pressed }) => ({
              width: STORY_CARD_W,
              height: STORY_IMG_H + STORY_BODY_H,
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
              <ContainedListingPhoto
                uri={a.cover_display_url}
                height={STORY_IMG_H}
                showBorder={false}
                borderRadius={0}
              />
            ) : (
              <View
                style={{
                  height: STORY_IMG_H,
                  backgroundColor: colors.accentTint,
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Ionicons name="color-palette-outline" size={40} color={colors.primary} />
              </View>
            )}
            <View
              style={{
                padding: space.md,
                height: STORY_BODY_H,
                justifyContent: "space-between",
              }}
            >
              <View>
                <View
                  style={{
                    height: STORY_SPOTLIGHT_H,
                    marginBottom: space.xs,
                    justifyContent: "center",
                  }}
                >
                  {lead ? (
                    <TextCaption
                      style={{
                        fontWeight: "700",
                        letterSpacing: 0.8,
                        color: colors.accent,
                        fontSize: 10,
                      }}
                    >
                      SPOTLIGHT
                    </TextCaption>
                  ) : null}
                </View>
                <Text
                  numberOfLines={STORY_TITLE_LINES}
                  style={{
                    fontFamily: fontFamilies.headingSerif,
                    fontSize: 17,
                    lineHeight: STORY_TITLE_LH,
                    height: STORY_TITLE_LH * STORY_TITLE_LINES,
                    fontWeight: "600",
                    color: colors.text,
                  }}
                >
                  {a.title}
                </Text>
                <TextCaption
                  numberOfLines={STORY_EXCERPT_LINES}
                  style={{
                    marginTop: space.xs,
                    lineHeight: STORY_EXCERPT_LH,
                    minHeight: STORY_EXCERPT_LH * STORY_EXCERPT_LINES,
                  }}
                >
                  {a.excerpt?.trim() ? a.excerpt : " "}
                </TextCaption>
              </View>
              <View
                style={{
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
