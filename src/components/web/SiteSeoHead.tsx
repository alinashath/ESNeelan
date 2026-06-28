import { APP_DEFAULT_DESCRIPTION, APP_DISPLAY_NAME, HOME_PAGE_TITLE } from "@/src/lib/brand";
import { getPublicSiteOrigin } from "@/src/lib/site-url";
import Head from "expo-router/head";
import { Platform } from "react-native";

type Props = {
  title: string;
  description?: string;
  /** Path only, e.g. `/` or `/artists` */
  canonicalPath?: string;
  ogType?: "website" | "article";
};

export function SiteSeoHead({
  title,
  description = APP_DEFAULT_DESCRIPTION,
  canonicalPath,
  ogType = "website",
}: Props) {
  if (Platform.OS !== "web") return null;

  const origin = getPublicSiteOrigin();
  const canonical =
    canonicalPath && origin
      ? `${origin}${canonicalPath.startsWith("/") ? canonicalPath : `/${canonicalPath}`}`
      : null;
  const defaultOg = process.env.EXPO_PUBLIC_DEFAULT_OG_IMAGE_URL?.trim() ?? "";
  const ogImage = defaultOg || null;

  return (
    <Head>
      <title>{title}</title>
      <meta name="description" content={description} />
      {canonical ? <link rel="canonical" href={canonical} /> : null}

      <meta property="og:site_name" content={APP_DISPLAY_NAME} />
      <meta property="og:type" content={ogType} />
      <meta property="og:title" content={title} />
      <meta property="og:description" content={description} />
      {canonical ? <meta property="og:url" content={canonical} /> : null}
      {ogImage ? <meta property="og:image" content={ogImage} /> : null}
      {ogImage ? (
        <meta property="og:image:alt" content={`${APP_DISPLAY_NAME} marketplace`} />
      ) : null}

      <meta name="twitter:card" content={ogImage ? "summary_large_image" : "summary"} />
      <meta name="twitter:title" content={title} />
      <meta name="twitter:description" content={description} />
      {ogImage ? <meta name="twitter:image" content={ogImage} /> : null}
    </Head>
  );
}

const HOME_TITLE = HOME_PAGE_TITLE;

const TAB_PAGE_TITLES: Record<string, string> = {
  "/": HOME_TITLE,
  "/explore": `Explore | ${APP_DISPLAY_NAME}`,
  "/artists": `Stories | ${APP_DISPLAY_NAME}`,
  "/notifications": `Alerts | ${APP_DISPLAY_NAME}`,
  "/profile": `Profile | ${APP_DISPLAY_NAME}`,
};

function normalizePathname(pathname: string): string {
  const base = pathname.split("?")[0]?.split("#")[0] ?? "/";
  if (base === "" || base === "/index") return "/";
  return base.replace(/\/$/, "") || "/";
}

export function resolveTabRouteSeo(pathname: string): { title: string; canonicalPath: string } {
  const path = normalizePathname(pathname);
  if (TAB_PAGE_TITLES[path]) {
    return { title: TAB_PAGE_TITLES[path], canonicalPath: path === "/" ? "/" : path };
  }
  if (path.startsWith("/profile")) {
    return { title: `Profile | ${APP_DISPLAY_NAME}`, canonicalPath: path };
  }
  return { title: HOME_TITLE, canonicalPath: "/" };
}
