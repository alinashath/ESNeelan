import { APP_DEFAULT_DESCRIPTION, APP_DISPLAY_NAME } from "@/src/lib/brand";
import Head from "expo-router/head";
import { Platform } from "react-native";
import { buildFeaturedArticlePublicUrl, getPublicSiteOrigin } from "@/src/lib/site-url";
import { plainTextSnippet } from "@/src/lib/plain-text-snippet";
import { optimizeArticleCoverImageUrl } from "@/src/lib/article-cover-image-url";

const SITE_NAME = APP_DISPLAY_NAME;
const DEFAULT_DESC = APP_DEFAULT_DESCRIPTION;

type Props =
  | { phase: "loading" | "error" | "missing"; slug: string }
  | {
      phase: "ready";
      slug: string;
      title: string;
      excerpt: string;
      coverDisplayUrl: string | null;
      publishedAt: string | null;
      updatedAt: string;
    };

export function FeaturedArticleSeoHead(props: Props) {
  if (Platform.OS !== "web") return null;

  const { slug } = props;
  const origin = getPublicSiteOrigin();
  const canonical = buildFeaturedArticlePublicUrl(slug);

  if (props.phase === "loading") {
    return (
      <Head>
        <title>Loading story… | {SITE_NAME}</title>
        <meta name="description" content={DEFAULT_DESC} />
        {origin ? <link rel="canonical" href={canonical} /> : null}
        <meta property="og:site_name" content={SITE_NAME} />
        <meta property="og:type" content="article" />
        <meta property="og:title" content={`Story | ${SITE_NAME}`} />
        <meta property="og:description" content={DEFAULT_DESC} />
        <meta property="og:url" content={canonical} />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content={`Story | ${SITE_NAME}`} />
        <meta name="twitter:description" content={DEFAULT_DESC} />
      </Head>
    );
  }

  if (props.phase === "error") {
    return (
      <Head>
        <title>Could not load story | {SITE_NAME}</title>
        <meta name="description" content={DEFAULT_DESC} />
        {origin ? <link rel="canonical" href={canonical} /> : null}
        <meta property="og:site_name" content={SITE_NAME} />
        <meta property="og:type" content="article" />
        <meta property="og:title" content={`Story | ${SITE_NAME}`} />
        <meta property="og:description" content={DEFAULT_DESC} />
        <meta property="og:url" content={canonical} />
        <meta name="robots" content="noindex" />
        <meta name="twitter:card" content="summary" />
        <meta name="twitter:title" content={`Story | ${SITE_NAME}`} />
        <meta name="twitter:description" content={DEFAULT_DESC} />
      </Head>
    );
  }

  if (props.phase === "missing") {
    const t = `Story unavailable | ${SITE_NAME}`;
    return (
      <Head>
        <title>{t}</title>
        <meta name="description" content="This story was not found or is no longer published." />
        {origin ? <link rel="canonical" href={canonical} /> : null}
        <meta property="og:site_name" content={SITE_NAME} />
        <meta property="og:type" content="article" />
        <meta property="og:title" content={t} />
        <meta property="og:description" content="This story was not found or is no longer published." />
        <meta property="og:url" content={canonical} />
        <meta name="robots" content="noindex" />
        <meta name="twitter:card" content="summary" />
        <meta name="twitter:title" content={t} />
        <meta name="twitter:description" content="This story was not found or is no longer published." />
      </Head>
    );
  }

  if (props.phase === "ready") {
    const { title, excerpt, coverDisplayUrl, publishedAt, updatedAt } = props;
    const pageTitle = `${title} | ${SITE_NAME}`;
    const desc = excerpt.trim()
      ? plainTextSnippet(excerpt, 300)
      : plainTextSnippet(`${title} — ${SITE_NAME}`, 300);
    const ogImageRaw = optimizeArticleCoverImageUrl(coverDisplayUrl, 1200);
    const defaultOg = process.env.EXPO_PUBLIC_DEFAULT_OG_IMAGE_URL?.trim() ?? "";
    const ogImage = ogImageRaw || defaultOg || null;

    return (
      <Head>
        <title>{pageTitle}</title>
        <meta name="description" content={desc} />
        {origin ? <link rel="canonical" href={canonical} /> : null}

        <meta property="og:site_name" content={SITE_NAME} />
        <meta property="og:type" content="article" />
        <meta property="og:title" content={pageTitle} />
        <meta property="og:description" content={desc} />
        <meta property="og:url" content={canonical} />
        {publishedAt ? <meta property="article:published_time" content={publishedAt} /> : null}
        {updatedAt ? <meta property="article:modified_time" content={updatedAt} /> : null}
        {ogImage ? <meta property="og:image" content={ogImage} /> : null}
        {ogImage ? <meta property="og:image:alt" content={title} /> : null}

        <meta name="twitter:card" content={ogImage ? "summary_large_image" : "summary"} />
        <meta name="twitter:title" content={pageTitle} />
        <meta name="twitter:description" content={desc} />
        {ogImage ? <meta name="twitter:image" content={ogImage} /> : null}
      </Head>
    );
  }

  return null;
}
