import { useLayoutEffect } from "react";
import { ActivityIndicator, Image, Text, View } from "react-native";
import { useLocalSearchParams, useNavigation } from "expo-router";
import { useFeaturedArticleBySlug } from "@/src/data/featured-articles";
import { Screen } from "@/src/components/ui/Screen";
import { TextBody } from "@/src/components/ui/TextBody";
import { FeaturedArticleBlockView } from "@/src/components/ui/FeaturedArticleBlockView";
import { ListEmptyState } from "@/src/components/ui/ListEmptyState";
import { ArticleShareActions } from "@/src/components/ui/ArticleShareActions";
import { FeaturedArticleSeoHead } from "@/src/components/web/FeaturedArticleSeoHead";
import { buildFeaturedArticlePublicUrl } from "@/src/lib/site-url";
import { optimizeArticleCoverImageUrl } from "@/src/lib/article-cover-image-url";
import { colors, space, typography } from "@/src/theme/tokens";
import { layout } from "@/src/theme/layout";

const HERO_IMAGE_DISPLAY_W = 960;

export default function FeaturedArticleScreen() {
  const navigation = useNavigation();
  const { slug: raw } = useLocalSearchParams<{ slug: string }>();
  const slug = typeof raw === "string" ? decodeURIComponent(raw) : "";
  const { data, isLoading, error } = useFeaturedArticleBySlug(slug || undefined, {
    enabled: Boolean(slug),
  });

  const shareUrl = slug ? buildFeaturedArticlePublicUrl(slug) : "";
  const shareTitle = data?.title?.trim() || "Article";

  useLayoutEffect(() => {
    if (!slug) {
      navigation.setOptions({ headerRight: () => null });
      return;
    }
    navigation.setOptions({
      headerRight: () => (
        <ArticleShareActions
          variant="header"
          title={shareTitle}
          url={shareUrl}
          excerpt={data?.excerpt}
        />
      ),
    });
  }, [navigation, slug, shareUrl, shareTitle, data?.excerpt]);

  if (!slug) {
    return (
      <Screen scroll>
        <FeaturedArticleSeoHead phase="missing" slug="" />
        <ListEmptyState icon="document-outline" title="Article not found" description="" />
      </Screen>
    );
  }

  if (isLoading) {
    return (
      <Screen scroll>
        <FeaturedArticleSeoHead phase="loading" slug={slug} />
        <View style={{ paddingVertical: space.xxl, alignItems: "center" }}>
          <ActivityIndicator color={colors.accent} accessibilityLabel="Loading article" />
        </View>
      </Screen>
    );
  }

  if (error) {
    return (
      <Screen scroll>
        <FeaturedArticleSeoHead phase="error" slug={slug} />
        <ListEmptyState
          icon="document-outline"
          title="Article not found"
          description="This story may have been unpublished."
        />
      </Screen>
    );
  }

  if (!data) {
    return (
      <Screen scroll>
        <FeaturedArticleSeoHead phase="missing" slug={slug} />
        <ListEmptyState
          icon="document-outline"
          title="Article not found"
          description="This story may have been unpublished."
        />
      </Screen>
    );
  }

  const heroUri = optimizeArticleCoverImageUrl(data.cover_display_url, HERO_IMAGE_DISPLAY_W);

  return (
    <>
      <FeaturedArticleSeoHead
        phase="ready"
        slug={data.slug}
        title={data.title}
        excerpt={data.excerpt}
        coverDisplayUrl={data.cover_display_url}
        publishedAt={data.published_at}
        updatedAt={data.updated_at}
      />
      <Screen
        scroll
        noPadding
        scrollProps={{ contentContainerStyle: { paddingBottom: space.xxl } }}
      >
        <View
          style={{
            width: "100%",
            maxWidth: layout.articleReadingMaxWidth,
            alignSelf: "center",
          }}
        >
          {heroUri ? (
            <Image
              source={{ uri: heroUri }}
              style={{
                width: "100%",
                height: 220,
                backgroundColor: colors.surfaceMuted,
                marginBottom: space.lg,
              }}
              resizeMode="cover"
            />
          ) : null}
          <View style={{ paddingHorizontal: space.lg }}>
            <Text style={{ ...typography.display, fontSize: 28, lineHeight: 34 }}>{data.title}</Text>
            {data.excerpt ? (
              <TextBody style={{ marginTop: space.md, lineHeight: 24, color: colors.textSecondary }}>
                {data.excerpt}
              </TextBody>
            ) : null}
            <ArticleShareActions title={data.title} url={shareUrl} excerpt={data.excerpt} />
            <View style={{ marginTop: space.xl }}>
              <FeaturedArticleBlockView blocks={data.blocks} />
            </View>
          </View>
        </View>
      </Screen>
    </>
  );
}
