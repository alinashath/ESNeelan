import {
  FlatList,
  Image,
  Modal,
  Pressable,
  useWindowDimensions,
  View,
} from "react-native";
import { useCallback, useEffect, useRef, useState } from "react";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { colors, radii, space } from "@/src/theme/tokens";
import { AuctionCountdownBadge } from "./AuctionCountdownBadge";
import { TextCaption } from "./TextCaption";

type Props = {
  imageUrls: string[];
  /** Hero height (default 260). */
  height?: number;
  /** Neon “LIVE” pill (e.g. active auction). */
  showLiveBadge?: boolean;
  /** When set with an active auction, Stitch-style countdown top-right. */
  endsAt?: string | null;
};

export function AuctionImageCarousel({
  imageUrls,
  height = 260,
  showLiveBadge,
  endsAt,
}: Props) {
  const { width: winW, height: winH } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const [idx, setIdx] = useState(0);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxPage, setLightboxPage] = useState(0);
  const listRef = useRef<FlatList<string>>(null);

  const openLightbox = useCallback(() => {
    setLightboxPage(idx);
    setLightboxOpen(true);
  }, [idx]);

  useEffect(() => {
    if (!lightboxOpen || !imageUrls.length) return;
    const t = requestAnimationFrame(() => {
      listRef.current?.scrollToIndex({
        index: Math.min(idx, imageUrls.length - 1),
        animated: false,
        viewPosition: 0,
      });
    });
    return () => cancelAnimationFrame(t);
  }, [lightboxOpen, idx, imageUrls.length]);

  const onLightboxMomentumEnd = useCallback(
    (e: { nativeEvent: { contentOffset: { x: number } } }) => {
      const page = Math.round(e.nativeEvent.contentOffset.x / winW);
      if (page >= 0 && page < imageUrls.length) setLightboxPage(page);
    },
    [winW, imageUrls.length],
  );

  if (!imageUrls.length) {
    return (
      <View
        style={{
          height,
          backgroundColor: colors.surfaceMuted,
          overflow: "hidden",
        }}
      />
    );
  }
  const uri = imageUrls[idx % imageUrls.length];

  return (
    <View style={{ overflow: "hidden", position: "relative" }}>
      <Pressable
        onPress={openLightbox}
        accessibilityRole="button"
        accessibilityLabel="View photos full screen"
      >
        <Image
          source={{ uri }}
          style={{ width: "100%", height }}
          resizeMode="cover"
        />
      </Pressable>
      {showLiveBadge ? (
        <View
          pointerEvents="none"
          style={{
            position: "absolute",
            top: space.md,
            left: space.md,
            flexDirection: "row",
            alignItems: "center",
            gap: 6,
            backgroundColor: colors.accent,
            paddingHorizontal: space.md,
            paddingVertical: space.xs,
            borderRadius: radii.pill,
          }}
        >
          <View
            style={{
              width: 8,
              height: 8,
              borderRadius: 4,
              backgroundColor: colors.primary,
            }}
          />
          <TextCaption style={{ color: colors.primary, fontWeight: "500" }}>
            LIVE
          </TextCaption>
        </View>
      ) : null}
      {showLiveBadge && endsAt ? (
        <AuctionCountdownBadge
          endsAt={endsAt}
          active
          maxWidth="52%"
          inset={space.md}
          style={{ top: insets.top + space.sm + 40 + space.xs }}
        />
      ) : null}
      <Pressable
        onPress={openLightbox}
        accessibilityRole="button"
        accessibilityLabel="View photos full screen"
        hitSlop={{ top: 4, bottom: 4, left: 4, right: 4 }}
        style={{
          position: "absolute",
          top: insets.top + space.sm,
          right: space.md,
          zIndex: 2,
          width: 40,
          height: 40,
          borderRadius: 20,
          backgroundColor: "rgba(10,10,15,0.55)",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Ionicons name="expand-outline" size={22} color={colors.white} />
      </Pressable>
      {imageUrls.length > 1 ? (
        <View
          pointerEvents="box-none"
          style={{
            position: "absolute",
            left: 0,
            right: 0,
            top: 0,
            bottom: 0,
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
            paddingHorizontal: space.sm,
          }}
        >
          <Pressable
            onPress={() => setIdx((i) => (i - 1 + imageUrls.length) % imageUrls.length)}
            accessibilityLabel="Previous photo"
            hitSlop={8}
            style={{
              width: 40,
              height: 40,
              borderRadius: 20,
              backgroundColor: "rgba(10,10,15,0.45)",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Ionicons name="chevron-back" size={22} color={colors.white} />
          </Pressable>
          <Pressable
            onPress={() => setIdx((i) => (i + 1) % imageUrls.length)}
            accessibilityLabel="Next photo"
            hitSlop={8}
            style={{
              width: 40,
              height: 40,
              borderRadius: 20,
              backgroundColor: "rgba(10,10,15,0.45)",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Ionicons name="chevron-forward" size={22} color={colors.white} />
          </Pressable>
        </View>
      ) : null}

      <Modal
        visible={lightboxOpen}
        transparent
        animationType="fade"
        onRequestClose={() => {
          setIdx(lightboxPage);
          setLightboxOpen(false);
        }}
        statusBarTranslucent
      >
        <View style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.94)" }}>
          <View
            style={{
              flex: 1,
              zIndex: 1,
              paddingTop: insets.top + space.sm,
              paddingBottom: insets.bottom + space.md,
            }}
          >
            <FlatList
              ref={listRef}
              data={imageUrls}
              keyExtractor={(_, i) => `lightbox-${i}`}
              horizontal
              pagingEnabled
              showsHorizontalScrollIndicator={false}
              bounces={imageUrls.length > 1}
              onMomentumScrollEnd={onLightboxMomentumEnd}
              getItemLayout={(_, i) => ({
                length: winW,
                offset: winW * i,
                index: i,
              })}
              onScrollToIndexFailed={({ index }) => {
                listRef.current?.scrollToOffset({
                  offset: winW * index,
                  animated: false,
                });
              }}
              initialNumToRender={Math.min(imageUrls.length, 3)}
              renderItem={({ item }) => (
                <View
                  style={{
                    width: winW,
                    height: winH - insets.top - insets.bottom - space.sm - space.md - 48,
                    justifyContent: "center",
                    alignItems: "center",
                  }}
                >
                  <Image
                    source={{ uri: item }}
                    style={{
                      width: winW,
                      height: "100%",
                      maxHeight: winH * 0.88,
                    }}
                    resizeMode="contain"
                  />
                </View>
              )}
            />
            {imageUrls.length > 1 ? (
              <TextCaption
                style={{
                  textAlign: "center",
                  color: colors.white,
                  marginTop: space.sm,
                  opacity: 0.85,
                }}
              >
                {lightboxPage + 1} / {imageUrls.length}
              </TextCaption>
            ) : null}
          </View>
          <Pressable
            onPress={() => {
              setIdx(lightboxPage);
              setLightboxOpen(false);
            }}
            hitSlop={16}
            accessibilityRole="button"
            accessibilityLabel="Close"
            style={{
              position: "absolute",
              top: insets.top + space.sm,
              right: space.md,
              zIndex: 2,
              width: 44,
              height: 44,
              borderRadius: 22,
              backgroundColor: "rgba(255,255,255,0.14)",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Ionicons name="close" size={28} color={colors.white} />
          </Pressable>
        </View>
      </Modal>
    </View>
  );
}
