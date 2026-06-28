import { APP_DISPLAY_NAME } from "@/src/lib/brand";
import { shareListing } from "@/src/lib/share-listing";
import { TextCaption } from "@/src/components/ui/TextCaption";
import { colors, radii, shadows, space } from "@/src/theme/tokens";
import { Ionicons } from "@expo/vector-icons";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  FlatList,
  Image,
  Modal,
  Platform,
  Pressable,
  View,
  useWindowDimensions,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

type Props = {
  imageUrls: string[];
  shareTitle?: string;
  /** Absolute listing URL (web + native share). */
  shareUrl?: string;
  /** Plain text body without the URL; if omitted, falls back to title. */
  shareMessage?: string;
  showLiveBadge?: boolean;
  /** `active` in DB but `ends_at` has passed — show muted “Closed” (not LIVE). */
  showClosedBadge?: boolean;
  /** When false, hides heart + share (e.g. seller managing a draft). Default true. */
  showListingActions?: boolean;
};

const OVERLAY_BTN = {
  width: 40,
  height: 40,
  borderRadius: 20,
  backgroundColor: "rgba(255,255,255,0.92)",
  alignItems: "center" as const,
  justifyContent: "center" as const,
  ...shadows.productImage,
};

export function AuctionDetailHeroGallery({
  imageUrls,
  shareTitle = `Auction on ${APP_DISPLAY_NAME}`,
  shareUrl,
  shareMessage,
  showLiveBadge,
  showClosedBadge,
  showListingActions = true,
}: Props) {
  const { width: winW, height: winH } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const [idx, setIdx] = useState(0);
  const [favorited, setFavorited] = useState(false);
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

  const onShare = useCallback(async () => {
    const message = shareMessage ?? shareTitle;
    await shareListing({ title: shareTitle, message, url: shareUrl ?? "" });
  }, [shareMessage, shareTitle, shareUrl]);

  if (!imageUrls.length) {
    return (
      <View
        style={{
          width: "100%",
          aspectRatio: 3 / 4,
          maxHeight: 560,
          backgroundColor: colors.surfaceMuted,
          borderRadius: radii.xl,
          borderWidth: 1,
          borderColor: colors.hairlineSoft,
        }}
      />
    );
  }

  const uri = imageUrls[idx % imageUrls.length];
  const heroStatusBadge = Boolean(showLiveBadge || showClosedBadge);
  const moreCount = imageUrls.length > 2 ? imageUrls.length - 2 : 0;
  /** When a “+N more” tile is shown, keep thumbnails compact instead of full-width. */
  const compactThumbs = imageUrls.length > 2;
  const thumbPx = compactThumbs
    ? Math.min(80, Math.max(52, Math.round(winW * 0.12)))
    : 0;

  return (
    <View style={{ width: "100%" }}>
      <View style={{ position: "relative", width: "100%" }}>
        <Pressable
          onPress={openLightbox}
          accessibilityRole="button"
          accessibilityLabel="View photos full screen"
        >
          <Image
            source={{ uri }}
            style={{
              width: "100%",
              aspectRatio: 3 / 4,
              maxHeight: Platform.OS === "web" ? 720 : 560,
              borderRadius: radii.xl,
              borderWidth: 1,
              borderColor: colors.hairlineSoft,
              backgroundColor: colors.surfaceMuted,
            }}
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
              backgroundColor: "rgba(0,0,0,0.52)",
              borderWidth: 1,
              borderColor: "rgba(255,255,255,0.2)",
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
                backgroundColor: colors.accent,
              }}
            />
            <TextCaption style={{ color: colors.white, fontWeight: "600", letterSpacing: 0.6 }}>
              LIVE
            </TextCaption>
          </View>
        ) : null}
        {showClosedBadge ? (
          <View
            pointerEvents="none"
            style={{
              position: "absolute",
              top: space.md,
              left: space.md,
              flexDirection: "row",
              alignItems: "center",
              gap: 6,
              backgroundColor: "rgba(0,0,0,0.52)",
              borderWidth: 1,
              borderColor: "rgba(255,255,255,0.2)",
              paddingHorizontal: space.md,
              paddingVertical: space.xs,
              borderRadius: radii.pill,
            }}
          >
            <TextCaption style={{ color: colors.white, fontWeight: "600" }}>Closed</TextCaption>
          </View>
        ) : null}
        {showListingActions ? (
          <View
            pointerEvents="box-none"
            style={{
              position: "absolute",
              top: heroStatusBadge ? 52 : space.md,
              right: space.md,
              gap: space.sm,
              alignItems: "flex-end",
            }}
          >
            <Pressable
              onPress={() => setFavorited((v) => !v)}
              accessibilityRole="button"
              accessibilityLabel={favorited ? "Remove from saved" : "Save listing"}
              style={OVERLAY_BTN}
            >
              <Ionicons
                name={favorited ? "heart" : "heart-outline"}
                size={22}
                color={favorited ? colors.accent : colors.textSecondary}
              />
            </Pressable>
            <Pressable
              onPress={() => void onShare()}
              accessibilityRole="button"
              accessibilityLabel="Share listing"
              style={OVERLAY_BTN}
            >
              <Ionicons name="share-outline" size={22} color={colors.textSecondary} />
            </Pressable>
          </View>
        ) : null}

        {imageUrls.length > 1 ? (
          <View
            pointerEvents="box-none"
            style={{
              position: "absolute",
              left: 0,
              right: 0,
              top: "38%",
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
                backgroundColor: "rgba(10,10,15,0.35)",
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
                backgroundColor: "rgba(10,10,15,0.35)",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Ionicons name="chevron-forward" size={22} color={colors.white} />
            </Pressable>
          </View>
        ) : null}
      </View>

      {imageUrls.length > 1 ? (
        <View
          style={{
            flexDirection: "row",
            gap: space.sm,
            marginTop: space.sm,
            alignSelf: compactThumbs ? "flex-start" : "stretch",
            justifyContent: compactThumbs ? "flex-start" : undefined,
          }}
        >
          {imageUrls.slice(0, 2).map((thumb, i) => (
            <Pressable
              key={`thumb-${thumb}-${i}`}
              onPress={() => setIdx(i)}
              style={
                compactThumbs
                  ? {
                      width: thumbPx,
                      height: thumbPx,
                      borderRadius: radii.md,
                      overflow: "hidden",
                      borderWidth: idx === i ? 2 : 1,
                      borderColor: idx === i ? colors.primary : colors.hairlineSoft,
                    }
                  : {
                      flex: 1,
                      minWidth: 0,
                      aspectRatio: 1,
                      borderRadius: radii.md,
                      overflow: "hidden",
                      borderWidth: idx === i ? 2 : 1,
                      borderColor: idx === i ? colors.primary : colors.hairlineSoft,
                    }
              }
            >
              <Image source={{ uri: thumb }} style={{ width: "100%", height: "100%" }} resizeMode="cover" />
            </Pressable>
          ))}
          {moreCount > 0 ? (
            <Pressable
              onPress={() => {
                setIdx(2);
                openLightbox();
              }}
              style={
                compactThumbs
                  ? {
                      width: thumbPx,
                      height: thumbPx,
                      borderRadius: radii.md,
                      backgroundColor: colors.surfaceCard,
                      borderWidth: 1,
                      borderColor: colors.hairlineSoft,
                      alignItems: "center",
                      justifyContent: "center",
                      paddingHorizontal: 4,
                    }
                  : {
                      flex: 1,
                      minWidth: 0,
                      aspectRatio: 1,
                      borderRadius: radii.md,
                      backgroundColor: colors.surfaceCard,
                      borderWidth: 1,
                      borderColor: colors.hairlineSoft,
                      alignItems: "center",
                      justifyContent: "center",
                    }
              }
            >
              <TextCaption
                style={{
                  fontWeight: "700",
                  color: colors.textMuted,
                  fontSize: compactThumbs ? 11 : 12,
                  textAlign: "center",
                }}
              >
                +{moreCount} More
              </TextCaption>
            </Pressable>
          ) : null}
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
              keyExtractor={(_, i) => `detail-lb-${i}`}
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
