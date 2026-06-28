import { APP_DEFAULT_DESCRIPTION, APP_DISPLAY_NAME } from "@/src/lib/brand";
import { ScrollViewStyleReset } from "expo-router/html";
import type { ReactNode } from "react";
import { palette } from "@/src/theme/tokens";

const SITE_NAME = APP_DISPLAY_NAME;
const DEFAULT_DESCRIPTION = APP_DEFAULT_DESCRIPTION;

function siteWideOpenGraphTags() {
  const siteUrl = process.env.EXPO_PUBLIC_SITE_URL?.trim().replace(/\/$/, "") ?? "";
  const defaultOgImage = process.env.EXPO_PUBLIC_DEFAULT_OG_IMAGE_URL?.trim() ?? "";
  const canonical = siteUrl ? `${siteUrl}/` : null;
  const ogImage = defaultOgImage || null;

  return (
    <>
      <title>{`${SITE_NAME} — Auctions & sellers`}</title>
      <meta name="description" content={DEFAULT_DESCRIPTION} />
      {canonical ? <link rel="canonical" href={canonical} /> : null}

      <meta property="og:site_name" content={SITE_NAME} />
      <meta property="og:type" content="website" />
      <meta property="og:title" content={`${SITE_NAME} — Auctions & sellers`} />
      <meta property="og:description" content={DEFAULT_DESCRIPTION} />
      {canonical ? <meta property="og:url" content={canonical} /> : null}
      {ogImage ? <meta property="og:image" content={ogImage} /> : null}
      {ogImage ? (
        <meta property="og:image:alt" content={`${SITE_NAME} marketplace`} />
      ) : null}

      <meta name="twitter:card" content={ogImage ? "summary_large_image" : "summary"} />
      <meta name="twitter:title" content={`${SITE_NAME} — Auctions & sellers`} />
      <meta name="twitter:description" content={DEFAULT_DESCRIPTION} />
      {ogImage ? <meta name="twitter:image" content={ogImage} /> : null}
    </>
  );
}

export default function Root({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta httpEquiv="X-UA-Compatible" content="IE=edge" />
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1, viewport-fit=cover, shrink-to-fit=no"
        />
        <meta name="theme-color" content={palette.canvasParchment} />
        {siteWideOpenGraphTags()}
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&display=swap"
          rel="stylesheet"
        />

        <ScrollViewStyleReset />

        <style dangerouslySetInnerHTML={{ __html: responsiveBackground }} />
      </head>
      <body>{children}</body>
    </html>
  );
}

const responsiveBackground = `
html, body {
  height: 100%;
  margin: 0;
  max-width: 100%;
  overflow-x: hidden;
  -webkit-text-size-adjust: 100%;
  scrollbar-width: none;
  -ms-overflow-style: none;
}
html::-webkit-scrollbar,
body::-webkit-scrollbar {
  width: 0;
  height: 0;
  display: none;
}
#root {
  min-height: 100%;
  display: flex;
  flex-direction: column;
  scrollbar-width: none;
  -ms-overflow-style: none;
}
#root::-webkit-scrollbar {
  width: 0;
  height: 0;
  display: none;
}
/* RN Web: ScrollView, FlatList, and nested scroll areas */
* {
  scrollbar-width: none;
  -ms-overflow-style: none;
}
*::-webkit-scrollbar {
  width: 0 !important;
  height: 0 !important;
  display: none !important;
}
body {
  background-color: ${palette.canvasParchment};
  color: ${palette.ink};
}
`;
