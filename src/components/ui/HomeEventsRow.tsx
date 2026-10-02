import { useCallback } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { ContainedListingPhoto } from "@/src/components/ui/ContainedListingPhoto";
import { router, useFocusEffect, type Href } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useHomeCollections, type SellerCollectionRow } from "@/src/data/seller-collections";
import { TextSectionTitle } from "@/src/components/ui/TextSectionTitle";
import { TextCaption } from "@/src/components/ui/TextCaption";
import { colors, fontFamilies, radii, space } from "@/src/theme/tokens";

const CARD_W = 220;
const IMG_H = 140;
const BODY_H = 112;
const TITLE_LH = 22;
const TITLE_LINES = 2;

function EventCard({ item, lead }: { item: SellerCollectionRow; lead: boolean }) {
  return (
    <Pressable
      onPress={() => router.push(`/collection/${item.id}` as Href)}
      accessibilityRole="button"
      accessibilityLabel={item.name}
      style={({ pressed }) => ({
        width: CARD_W,
        height: IMG_H + BODY_H,
        borderRadius: radii.lg,
        borderWidth: StyleSheet.hairlineWidth,
        borderColor: colors.border,
        borderTopWidth: lead || item.is_featured ? 3 : StyleSheet.hairlineWidth,
        borderTopColor: lead || item.is_featured ? colors.primary : colors.border,
        backgroundColor: colors.white,
        overflow: "hidden",
        opacity: pressed ? 0.92 : 1,
      })}
    >
      {item.cover_url ? (
        <ContainedListingPhoto
          uri={item.cover_url}
          height={IMG_H}
          showBorder={false}
          borderRadius={0}
        />
      ) : (
        <View
          style={{
            height: IMG_H,
            backgroundColor: colors.accentTint,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Ionicons name="albums-outline" size={36} color={colors.primary} />
        </View>
      )}
      <View
        style={{
          paddingHorizontal: space.md,
          paddingVertical: space.sm,
          height: BODY_H,
          justifyContent: "space-between",
        }}
      >
        <View>
          {item.is_featured ? (
            <TextCaption
              style={{
                fontWeight: "700",
                letterSpacing: 0.8,
                color: colors.accent,
                fontSize: 10,
                marginBottom: 4,
              }}
            >
              FEATURED
            </TextCaption>
          ) : null}
          <Text
            numberOfLines={TITLE_LINES}
            style={{
              fontFamily: fontFamilies.headingSerif,
              fontSize: 17,
              lineHeight: TITLE_LH,
              height: TITLE_LH * TITLE_LINES,
              fontWeight: "400",
              color: colors.text,
            }}
          >
            {item.name}
          </Text>
        </View>
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
            borderTopWidth: StyleSheet.hairlineWidth,
            borderTopColor: colors.border,
            paddingTop: space.sm,
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
            View
          </Text>
          <View
            style={{
              width: 28,
              height: 28,
              borderRadius: radii.pill,
              backgroundColor: colors.tertiaryMuted,
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Ionicons name="arrow-forward" size={14} color={colors.primary} />
          </View>
        </View>
      </View>
    </Pressable>
  );
}

/** Home: Events rail after featured auctions / before Stories. Hidden when empty. */
export function HomeEventsRow() {
  const { data, isLoading, refetch } = useHomeCollections(12);
  const list: SellerCollectionRow[] = Array.isArray(data) ? data : [];

  useFocusEffect(
    useCallback(() => {
      void refetch();
    }, [refetch]),
  );

  if (isLoading && list.length === 0) {
    return (
      <View style={{ marginTop: space.xl, paddingVertical: space.lg, alignItems: "center" }}>
        <ActivityIndicator color={colors.accent} accessibilityLabel="Loading events" />
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
        <TextSectionTitle>Events</TextSectionTitle>
        <Pressable
          onPress={() => router.push("/(tabs)/collections" as Href)}
          accessibilityRole="button"
          accessibilityLabel="View all events"
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
            ALL EVENTS
          </Text>
          <Ionicons name="chevron-forward" size={18} color={colors.primary} />
        </Pressable>
      </View>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: space.lg, gap: space.md, paddingBottom: 4 }}
      >
        {list.map((item, index) => (
          <EventCard key={item.id} item={item} lead={index === 0} />
        ))}
      </ScrollView>
    </View>
  );
}
