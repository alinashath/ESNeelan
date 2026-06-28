import { APP_DEFAULT_DESCRIPTION, APP_DISPLAY_NAME } from "@/src/lib/brand";
import { buildAuctionPublicUrl, getPublicSiteOrigin } from "@/src/lib/site-url";
import { plainTextSnippet } from "@/src/lib/plain-text-snippet";
import Head from "expo-router/head";
import { Platform } from "react-native";

const SITE_NAME = APP_DISPLAY_NAME;
const DEFAULT_DESC = APP_DEFAULT_DESCRIPTION;

type Props =
  | { phase: "loading" | "error" | "missing"; auctionId: string }
  | {
      phase: "ready";
      auctionId: string;
      title: string;
      description: string;
      imageUrl?: string | null;
      subtitle?: string;
    };

export function AuctionSeoHead(props: Props) {
  if (Platform.OS !== "web") return null;

  const { auctionId } = props;
  const origin = getPublicSiteOrigin();
  const canonical = buildAuctionPublicUrl(auctionId);

  if (props.phase === "loading") {
    return (
      <Head>
        <title>Loading auction… | {SITE_NAME}</title>
        <meta name="description" content={DEFAULT_DESC} />
        {origin ? <link rel="canonical" href={canonical} /> : null}
        <meta property="og:site_name" content={SITE_NAME} />
        <meta property="og:type" content="website" />
        <meta property="og:title" content={`Auction | ${SITE_NAME}`} />
        <meta property="og:description" content={DEFAULT_DESC} />
        <meta property="og:url" content={canonical} />
        <meta name="twitter:card" content="summary" />
        <meta name="twitter:title" content={`Auction | ${SITE_NAME}`} />
        <meta name="twitter:description" content={DEFAULT_DESC} />
      </Head>
    );
  }

  if (props.phase === "error") {
    return (
      <Head>
        <title>Could not load auction | {SITE_NAME}</title>
        <meta name="description" content={DEFAULT_DESC} />
        {origin ? <link rel="canonical" href={canonical} /> : null}
        <meta property="og:site_name" content={SITE_NAME} />
        <meta property="og:type" content="website" />
        <meta property="og:title" content={`Auction | ${SITE_NAME}`} />
        <meta property="og:description" content={DEFAULT_DESC} />
        <meta property="og:url" content={canonical} />
        <meta name="twitter:card" content="summary" />
        <meta name="twitter:title" content={`Auction | ${SITE_NAME}`} />
        <meta name="twitter:description" content={DEFAULT_DESC} />
      </Head>
    );
  }

  if (props.phase === "missing") {
    const t = `Listing unavailable | ${SITE_NAME}`;
    return (
      <Head>
        <title>{t}</title>
        <meta name="description" content="This auction was not found or is no longer available." />
        {origin ? <link rel="canonical" href={canonical} /> : null}
        <meta property="og:site_name" content={SITE_NAME} />
        <meta property="og:type" content="website" />
        <meta property="og:title" content={t} />
        <meta
          property="og:description"
          content="This auction was not found or is no longer available."
        />
        <meta property="og:url" content={canonical} />
        <meta name="robots" content="noindex" />
        <meta name="twitter:card" content="summary" />
        <meta name="twitter:title" content={t} />
        <meta
          name="twitter:description"
          content="This auction was not found or is no longer available."
        />
      </Head>
    );
  }

  if (props.phase !== "ready") return null;

  const { title, description, imageUrl, subtitle } = props;
  const pageTitle = `${title} | ${SITE_NAME}`;
  const bodyBits = [plainTextSnippet(description, 280), subtitle].filter(Boolean);
  const desc =
    bodyBits.length > 0 ? plainTextSnippet(bodyBits.join(" — "), 300) : DEFAULT_DESC;
  const defaultOg = process.env.EXPO_PUBLIC_DEFAULT_OG_IMAGE_URL?.trim() ?? "";
  const ogImage = imageUrl?.trim() || defaultOg || null;

  return (
    <Head>
      <title>{pageTitle}</title>
      <meta name="description" content={desc} />
      {origin ? <link rel="canonical" href={canonical} /> : null}

      <meta property="og:site_name" content={SITE_NAME} />
      <meta property="og:type" content="website" />
      <meta property="og:title" content={pageTitle} />
      <meta property="og:description" content={desc} />
      <meta property="og:url" content={canonical} />
      {ogImage ? <meta property="og:image" content={ogImage} /> : null}
      {ogImage ? <meta property="og:image:alt" content={title} /> : null}

      <meta name="twitter:card" content={ogImage ? "summary_large_image" : "summary"} />
      <meta name="twitter:title" content={pageTitle} />
      <meta name="twitter:description" content={desc} />
      {ogImage ? <meta name="twitter:image" content={ogImage} /> : null}
    </Head>
  );
}
