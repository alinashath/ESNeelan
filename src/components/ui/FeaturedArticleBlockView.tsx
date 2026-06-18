import { useCallback } from "react";
import {
  Image,
  Linking,
  Pressable,
  Text,
  View,
  type TextStyle,
  type ViewStyle,
} from "react-native";
import { router, type Href } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import type { FeaturedArticleBlock } from "@/src/lib/featured-article-blocks";
import { TextBody } from "@/src/components/ui/TextBody";
import { TextCaption } from "@/src/components/ui/TextCaption";
import { ButtonPrimary } from "@/src/components/ui/ButtonPrimary";
import { FeaturedArticleAuctionEmbed } from "@/src/components/ui/FeaturedArticleAuctionEmbed";
import { FeaturedArticleCollectionEmbed } from "@/src/components/ui/FeaturedArticleCollectionEmbed";
import { featuredArticleImagePublicUrl } from "@/src/lib/featured-article-images";
import { colors, fontFamilies, radii, space, typography } from "@/src/theme/tokens";

function telHref(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed) return "";
  const normalized = trimmed.replace(/[^\d+]/g, "");
  return normalized ? `tel:${normalized}` : "";
}

function navigateHref(href: string) {
  const h = href.trim();
  if (!h) return;
  if (h.startsWith("http://") || h.startsWith("https://")) {
    void Linking.openURL(h);
    return;
  }
  const path = h.startsWith("/") ? h : `/${h}`;
  router.push(path as Href);
}

type Props = {
  blocks: FeaturedArticleBlock[];
};

export function FeaturedArticleBlockView({ blocks }: Props) {
  const openTel = useCallback((raw: string) => {
    const t = telHref(raw);
    if (t) void Linking.openURL(t);
  }, []);

  return (
    <View style={{ gap: space.lg }}>
      {blocks.map((block, i) => (
        <BlockRow key={`${block.type}-${i}`} block={block} onPhonePress={openTel} />
      ))}
    </View>
  );
}

function BlockRow({
  block,
  onPhonePress,
}: {
  block: FeaturedArticleBlock;
  onPhonePress: (n: string) => void;
}) {
  switch (block.type) {
    case "heading": {
      const level = block.level ?? 2;
      const style: TextStyle =
        level === 1
          ? typography.display
          : level === 2
            ? typography.title
            : typography.section;
      return <Text style={style}>{block.text}</Text>;
    }
    case "paragraph":
      return (
        <TextBody style={{ lineHeight: 24, color: colors.textSecondary }}>{block.text}</TextBody>
      );
    case "quote": {
      const wrap: ViewStyle = {
        borderLeftWidth: 4,
        borderLeftColor: colors.accent,
        paddingLeft: space.md,
        paddingVertical: space.xs,
        backgroundColor: colors.accentTint,
        borderRadius: radii.sm,
      };
      return (
        <View style={wrap}>
          <Text
            style={{
              fontFamily: fontFamilies.headingSerif,
              fontSize: 18,
              lineHeight: 26,
              color: colors.text,
              fontStyle: "italic",
            }}
          >
            {block.text}
          </Text>
          {block.attribution ? (
            <TextCaption style={{ marginTop: space.sm, color: colors.textMuted }}>
              — {block.attribution}
            </TextCaption>
          ) : null}
        </View>
      );
    }
    case "qa":
      return (
        <View
          style={{
            borderWidth: 1,
            borderColor: colors.border,
            borderRadius: radii.md,
            padding: space.lg,
            backgroundColor: colors.background,
          }}
        >
          <Text
            style={{
              fontFamily: fontFamilies.bodySemiBold,
              fontWeight: "600",
              fontSize: 15,
              color: colors.text,
            }}
          >
            {block.question}
          </Text>
          <TextBody style={{ marginTop: space.sm, lineHeight: 22, color: colors.textSecondary }}>
            {block.answer}
          </TextBody>
        </View>
      );
    case "phone": {
      const canCall = Boolean(telHref(block.number));
      return (
        <Pressable
          onPress={() => (canCall ? onPhonePress(block.number) : undefined)}
          disabled={!canCall}
          style={({ pressed }) => ({
            flexDirection: "row",
            alignItems: "center",
            gap: space.md,
            padding: space.lg,
            borderRadius: radii.md,
            borderWidth: 1,
            borderColor: colors.border,
            backgroundColor: colors.surfaceSoft,
            opacity: pressed ? 0.85 : 1,
          })}
        >
          <View
            style={{
              width: 44,
              height: 44,
              borderRadius: 22,
              backgroundColor: colors.accentTint,
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Ionicons name="call-outline" size={22} color={colors.primary} />
          </View>
          <View style={{ flex: 1, minWidth: 0 }}>
            {block.label ? (
              <TextCaption style={{ color: colors.textMuted, marginBottom: 2 }}>
                {block.label}
              </TextCaption>
            ) : null}
            <TextBody style={{ fontWeight: "600", color: colors.primary }}>{block.number}</TextBody>
          </View>
          {canCall ? <Ionicons name="chevron-forward" size={18} color={colors.textMuted} /> : null}
        </Pressable>
      );
    }
    case "fact_card":
      return (
        <View
          style={{
            borderRadius: radii.md,
            borderWidth: 1,
            borderColor: colors.border,
            padding: space.lg,
            backgroundColor: colors.surfaceBlush,
          }}
        >
          <Text
            style={{
              ...typography.section,
              fontSize: 18,
              marginBottom: space.sm,
            }}
          >
            {block.title}
          </Text>
          {block.facts.filter(Boolean).map((line, idx) => (
            <View
              key={`${idx}-${line.slice(0, 12)}`}
              style={{ flexDirection: "row", gap: space.sm, marginTop: space.xs }}
            >
              <Text style={{ color: colors.accent, fontWeight: "700" }}>•</Text>
              <TextBody style={{ flex: 1, lineHeight: 22 }}>{line}</TextBody>
            </View>
          ))}
        </View>
      );
    case "photo": {
      const url = block.storage_path.trim()
        ? featuredArticleImagePublicUrl(block.storage_path.trim())
        : "";
      if (!url) return null;
      const placement = block.placement ?? "contained";
      const outer: ViewStyle =
        placement === "bleed"
          ? { marginHorizontal: -space.lg, width: "100%" }
          : placement === "wide"
            ? { alignSelf: "center", width: "100%", maxWidth: 560 }
            : { width: "100%" };
      return (
        <View style={outer}>
          <Image
            source={{ uri: url }}
            accessibilityLabel={block.alt?.trim() || "Article photo"}
            style={{
              width: "100%",
              aspectRatio: 16 / 9,
              borderRadius: placement === "bleed" ? 0 : radii.md,
              backgroundColor: colors.surfaceMuted,
            }}
            resizeMode="cover"
          />
          {block.alt?.trim() ? (
            <TextCaption style={{ marginTop: space.xs, color: colors.textMuted }}>
              {block.alt.trim()}
            </TextCaption>
          ) : null}
        </View>
      );
    }
    case "collection_embed": {
      const cid = block.collection_id?.trim();
      if (!cid) return null;
      return (
        <FeaturedArticleCollectionEmbed collectionId={cid} caption={block.label?.trim() ? block.label : null} />
      );
    }
    case "inline_action": {
      const auctionId = block.auction_id?.trim();
      if (auctionId) {
        const display = block.auction_display ?? "card";
        return (
          <View style={{ gap: space.md }}>
            <FeaturedArticleAuctionEmbed
              auctionId={auctionId}
              display={display}
              caption={block.label?.trim() ? block.label : null}
            />
          </View>
        );
      }
      return (
        <View style={{ alignItems: "flex-start" }}>
          <ButtonPrimary title={block.label} onPress={() => navigateHref(block.href)} />
        </View>
      );
    }
    default:
      return null;
  }
}
