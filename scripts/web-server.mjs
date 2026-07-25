/**
 * Production web server: static `dist/` + SPA fallback + OG HTML for social crawlers
 * + dynamic `/sitemap.xml` and `/robots.txt`.
 */
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  connectRedis,
  isRedisConfigured,
  pingRedis,
} from "./redis-client.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DIST = path.join(__dirname, "..", "dist");
const PORT = Number(process.env.PORT) || 8080;

const APP_DISPLAY_NAME = "AUC";
const APP_DEFAULT_DESCRIPTION =
  "Browse live auctions, place bids, and discover sellers on AUC — the Maldives auction marketplace.";
const SUPABASE_URL = (process.env.EXPO_PUBLIC_SUPABASE_URL || "").replace(/\/$/, "");
const SUPABASE_ANON = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || "";
const SITE_URL = (process.env.EXPO_PUBLIC_SITE_URL || "").replace(/\/$/, "");
const DEFAULT_OG_IMAGE = (process.env.EXPO_PUBLIC_DEFAULT_OG_IMAGE_URL || "").trim();

const BOT_UA =
  /facebookexternalhit|Facebot|Twitterbot|WhatsApp|Slackbot|LinkedInBot|Discordbot|TelegramBot|Pinterest|Googlebot|bingbot/i;

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const SLUG_RE = /^[\w-]{1,200}$/;

const FEATURED_ARTICLE_IMAGES_BUCKET = "featured-article-images";

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json",
  ".xml": "application/xml; charset=utf-8",
  ".txt": "text/plain; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
  ".ttf": "font/ttf",
  ".webp": "image/webp",
};

/** Public catalog statuses (matches `CATALOG_LISTING_STATUSES` in the app). */
const SITEMAP_AUCTION_STATUSES = ["active", "ended", "completed", "won", "paid"];

const SITEMAP_STATIC_PATHS = [
  { path: "/", changefreq: "daily", priority: "1.0" },
  { path: "/explore", changefreq: "daily", priority: "0.9" },
  { path: "/artists", changefreq: "daily", priority: "0.8" },
  { path: "/categories", changefreq: "weekly", priority: "0.7" },
  { path: "/sellers", changefreq: "daily", priority: "0.7" },
];

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function escapeXml(s) {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function getRequestOrigin(req) {
  if (SITE_URL) return SITE_URL;
  const host = req.headers["x-forwarded-host"] || req.headers.host;
  if (!host) return "";
  const protoHeader = req.headers["x-forwarded-proto"];
  const proto = String(protoHeader || "https").split(",")[0].trim() || "https";
  return `${proto}://${host}`.replace(/\/$/, "");
}

function toSitemapLastmod(value) {
  if (!value) return null;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString();
}

function sitemapUrlEntry({ loc, lastmod, changefreq, priority }) {
  const parts = [`    <loc>${escapeXml(loc)}</loc>`];
  if (lastmod) parts.push(`    <lastmod>${escapeXml(lastmod)}</lastmod>`);
  if (changefreq) parts.push(`    <changefreq>${escapeXml(changefreq)}</changefreq>`);
  if (priority) parts.push(`    <priority>${escapeXml(priority)}</priority>`);
  return `  <url>\n${parts.join("\n")}\n  </url>`;
}

function formatMoneyAmount(amount) {
  return new Intl.NumberFormat("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number(amount) || 0);
}

function plainTextSnippet(raw, maxLen) {
  const stripped = String(raw)
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  if (stripped.length <= maxLen) return stripped;
  return `${stripped.slice(0, Math.max(0, maxLen - 1)).trimEnd()}…`;
}

function storagePublicUrl(bucket, storagePath) {
  if (!SUPABASE_URL || !storagePath) return "";
  return `${SUPABASE_URL}/storage/v1/object/public/${bucket}/${storagePath}`;
}

function resolveArticleCoverUrl(storagePath, externalUrl) {
  const sp = storagePath?.trim();
  if (sp) return storagePublicUrl(FEATURED_ARTICLE_IMAGES_BUCKET, sp);
  const ext = externalUrl?.trim();
  return ext || "";
}

function optimizeArticleCoverImageUrl(url, maxWidth) {
  const raw = url?.trim();
  if (!raw) return "";
  try {
    if (raw.includes("images.unsplash.com")) {
      const u = new URL(raw);
      u.searchParams.set("w", String(Math.min(maxWidth, 1920)));
      u.searchParams.set("q", "82");
      u.searchParams.set("auto", "format");
      u.searchParams.set("fit", "crop");
      return u.toString();
    }
  } catch {
    /* ignore */
  }
  return raw;
}

async function supabaseRestGet(table, filters, select) {
  if (!SUPABASE_URL || !SUPABASE_ANON) return null;
  const url = new URL(`${SUPABASE_URL}/rest/v1/${table}`);
  for (const [key, value] of Object.entries(filters)) {
    url.searchParams.set(key, value);
  }
  url.searchParams.set("select", select);
  const res = await fetch(url, {
    headers: {
      apikey: SUPABASE_ANON,
      Authorization: `Bearer ${SUPABASE_ANON}`,
    },
  });
  if (!res.ok) return null;
  const rows = await res.json();
  return Array.isArray(rows) && rows.length > 0 ? rows[0] : null;
}

/** Paginated PostgREST list (anon key; respects RLS). */
async function supabaseRestList(table, filters, select, { order, pageSize = 1000, maxRows = 10000 } = {}) {
  if (!SUPABASE_URL || !SUPABASE_ANON) return [];
  const all = [];
  let offset = 0;
  while (offset < maxRows) {
    const url = new URL(`${SUPABASE_URL}/rest/v1/${table}`);
    for (const [key, value] of Object.entries(filters)) {
      url.searchParams.set(key, value);
    }
    url.searchParams.set("select", select);
    if (order) url.searchParams.set("order", order);
    const end = Math.min(offset + pageSize - 1, maxRows - 1);
    const res = await fetch(url, {
      headers: {
        apikey: SUPABASE_ANON,
        Authorization: `Bearer ${SUPABASE_ANON}`,
        Range: `${offset}-${end}`,
        Prefer: "count=exact",
      },
    });
    if (!res.ok) break;
    const rows = await res.json();
    if (!Array.isArray(rows) || rows.length === 0) break;
    all.push(...rows);
    if (rows.length < pageSize) break;
    offset += pageSize;
  }
  return all;
}

async function fetchSitemapAuctionRows() {
  return supabaseRestList(
    "auctions",
    { status: `in.(${SITEMAP_AUCTION_STATUSES.join(",")})` },
    "id,updated_at",
    { order: "updated_at.desc" },
  );
}

async function fetchSitemapArticleRows() {
  const nowIso = new Date().toISOString();
  return supabaseRestList(
    "featured_articles",
    {
      status: "eq.published",
      published_at: `lte.${nowIso}`,
    },
    "slug,updated_at,published_at",
    { order: "published_at.desc" },
  );
}

async function fetchSitemapSellerIds() {
  const rows = await supabaseRestList(
    "auctions",
    { status: "eq.active" },
    "seller_id",
    { order: "seller_id.asc" },
  );
  return [...new Set(rows.map((r) => r?.seller_id).filter(Boolean).map(String))];
}

async function buildSitemapXml(origin) {
  const entries = SITEMAP_STATIC_PATHS.map((p) =>
    sitemapUrlEntry({
      loc: `${origin}${p.path === "/" ? "/" : p.path}`,
      changefreq: p.changefreq,
      priority: p.priority,
    }),
  );

  try {
    const [auctions, articles, sellerIds] = await Promise.all([
      fetchSitemapAuctionRows(),
      fetchSitemapArticleRows(),
      fetchSitemapSellerIds(),
    ]);

    for (const row of auctions) {
      if (!row?.id || !UUID_RE.test(String(row.id))) continue;
      entries.push(
        sitemapUrlEntry({
          loc: `${origin}/auction/${encodeURIComponent(row.id)}`,
          lastmod: toSitemapLastmod(row.updated_at),
          changefreq: "daily",
          priority: "0.8",
        }),
      );
    }

    for (const row of articles) {
      const slug = String(row?.slug || "").trim();
      if (!SLUG_RE.test(slug)) continue;
      entries.push(
        sitemapUrlEntry({
          loc: `${origin}/article/${encodeURIComponent(slug)}`,
          lastmod: toSitemapLastmod(row.updated_at || row.published_at),
          changefreq: "weekly",
          priority: "0.7",
        }),
      );
    }

    for (const id of sellerIds) {
      if (!UUID_RE.test(id)) continue;
      entries.push(
        sitemapUrlEntry({
          loc: `${origin}/seller/${encodeURIComponent(id)}`,
          changefreq: "weekly",
          priority: "0.6",
        }),
      );
    }
  } catch {
    /* still return static URLs */
  }

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${entries.join("\n")}
</urlset>
`;
}

function buildRobotsTxt(origin) {
  const lines = [
    "User-agent: *",
    "Allow: /",
    "Disallow: /admin",
    "Disallow: /create",
    "Disallow: /my-auctions",
    "Disallow: /won",
    "Disallow: /login",
    "Disallow: /signup",
    "Disallow: /verify",
    "Disallow: /profile",
    "Disallow: /notifications",
    "Disallow: /_sitemap",
    "",
  ];
  if (origin) {
    lines.push(`Sitemap: ${origin}/sitemap.xml`, "");
  }
  return lines.join("\n");
}

async function fetchAuctionForOg(id) {
  return supabaseRestGet(
    "auctions",
    { id: `eq.${id}` },
    "title,description,current_highest_bid,starting_price,bid_count,auction_images(storage_path,sort_order)",
  );
}

async function fetchArticleForOg(slug) {
  return supabaseRestGet(
    "featured_articles",
    { slug: `eq.${slug}` },
    "title,excerpt,cover_image_url,cover_image_storage_path,published_at,updated_at",
  );
}

function buildOgPageHtml({
  pageTitle,
  title,
  desc,
  canonicalUrl,
  ogImage,
  ogType,
  publishedAt,
  updatedAt,
  linkLabel,
}) {
  const card = ogImage ? "summary_large_image" : "summary";
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8"/>
  <link rel="icon" href="/favicon.ico" sizes="any"/>
  <link rel="icon" type="image/png" sizes="48x48" href="/favicon.png"/>
  <link rel="apple-touch-icon" href="/apple-touch-icon.png"/>
  <title>${escapeHtml(pageTitle)}</title>
  <meta name="description" content="${escapeHtml(desc)}"/>
  <meta property="og:site_name" content="${escapeHtml(APP_DISPLAY_NAME)}"/>
  <meta property="og:type" content="${escapeHtml(ogType)}"/>
  <meta property="og:title" content="${escapeHtml(pageTitle)}"/>
  <meta property="og:description" content="${escapeHtml(desc)}"/>
  <meta property="og:url" content="${escapeHtml(canonicalUrl)}"/>
  ${publishedAt ? `<meta property="article:published_time" content="${escapeHtml(publishedAt)}"/>` : ""}
  ${updatedAt ? `<meta property="article:modified_time" content="${escapeHtml(updatedAt)}"/>` : ""}
  ${ogImage ? `<meta property="og:image" content="${escapeHtml(ogImage)}"/>` : ""}
  ${ogImage ? `<meta property="og:image:alt" content="${escapeHtml(title)}"/>` : ""}
  <meta name="twitter:card" content="${card}"/>
  <meta name="twitter:title" content="${escapeHtml(pageTitle)}"/>
  <meta name="twitter:description" content="${escapeHtml(desc)}"/>
  ${ogImage ? `<meta name="twitter:image" content="${escapeHtml(ogImage)}"/>` : ""}
  <meta http-equiv="refresh" content="0;url=${escapeHtml(canonicalUrl)}"/>
</head>
<body><p><a href="${escapeHtml(canonicalUrl)}">${escapeHtml(linkLabel)}</a></p></body>
</html>`;
}

function buildAuctionOgHtml(auction, canonicalUrl) {
  const title = auction.title || "Auction";
  const pageTitle = `${title} | ${APP_DISPLAY_NAME}`;
  const currentBid = auction.current_highest_bid ?? auction.starting_price ?? 0;
  const bidCount = auction.bid_count ?? 0;
  const subtitle = `Current bid MVR ${formatMoneyAmount(currentBid)} · ${bidCount} ${bidCount === 1 ? "bid" : "bids"}`;
  const descBits = [plainTextSnippet(auction.description || "", 280), subtitle].filter(Boolean);
  const desc =
    descBits.length > 0
      ? plainTextSnippet(descBits.join(" — "), 300)
      : APP_DEFAULT_DESCRIPTION;

  const imgs = [...(auction.auction_images || [])].sort(
    (a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0),
  );
  const firstPath = imgs[0]?.storage_path;
  const ogImage = (firstPath ? storagePublicUrl("auction-images", firstPath) : "") || DEFAULT_OG_IMAGE;

  return buildOgPageHtml({
    pageTitle,
    title,
    desc,
    canonicalUrl,
    ogImage,
    ogType: "website",
    publishedAt: null,
    updatedAt: null,
    linkLabel: `View auction on ${APP_DISPLAY_NAME}`,
  });
}

function buildArticleOgHtml(article, canonicalUrl) {
  const title = article.title || "Story";
  const pageTitle = `${title} | ${APP_DISPLAY_NAME}`;
  const desc = article.excerpt?.trim()
    ? plainTextSnippet(article.excerpt, 300)
    : plainTextSnippet(`${title} — ${APP_DISPLAY_NAME}`, 300);
  const coverRaw = resolveArticleCoverUrl(
    article.cover_image_storage_path,
    article.cover_image_url,
  );
  const ogImage =
    optimizeArticleCoverImageUrl(coverRaw, 1200) || DEFAULT_OG_IMAGE || "";

  return buildOgPageHtml({
    pageTitle,
    title,
    desc,
    canonicalUrl,
    ogImage,
    ogType: "article",
    publishedAt: article.published_at || null,
    updatedAt: article.updated_at || null,
    linkLabel: `Read story on ${APP_DISPLAY_NAME}`,
  });
}

function resolveStaticPath(urlPath) {
  const clean = urlPath.split("?")[0] || "/";
  let filePath = path.normalize(path.join(DIST, clean));
  if (!filePath.startsWith(DIST)) return null;
  if (clean.endsWith("/")) {
    filePath = path.join(filePath, "index.html");
  }
  return filePath;
}

function looksLikeAsset(urlPath) {
  const ext = path.extname(urlPath.split("?")[0] || "");
  return ext.length > 0 && ext !== ".html";
}

function sendFile(res, filePath) {
  const ext = path.extname(filePath);
  const type = MIME[ext] || "application/octet-stream";
  const stream = fs.createReadStream(filePath);
  res.writeHead(200, { "Content-Type": type });
  stream.pipe(res);
}

function sendSpa(res) {
  sendFile(res, path.join(DIST, "index.html"));
}

const server = http.createServer(async (req, res) => {
  const urlPath = req.url?.split("?")[0] || "/";
  const ua = req.headers["user-agent"] || "";

  if (urlPath === "/health/redis") {
    const configured = isRedisConfigured();
    const ok = configured ? await pingRedis() : false;
    res.writeHead(ok ? 200 : 503, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ ok, configured }));
    return;
  }

  if (urlPath === "/robots.txt") {
    const origin = getRequestOrigin(req);
    res.writeHead(200, {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "public, max-age=3600",
    });
    res.end(buildRobotsTxt(origin));
    return;
  }

  if (urlPath === "/sitemap.xml") {
    const origin = getRequestOrigin(req);
    if (!origin) {
      res.writeHead(503, { "Content-Type": "text/plain; charset=utf-8" });
      res.end("Set EXPO_PUBLIC_SITE_URL (or serve behind a Host header) to generate sitemap URLs.");
      return;
    }
    try {
      const xml = await buildSitemapXml(origin);
      res.writeHead(200, {
        "Content-Type": "application/xml; charset=utf-8",
        "Cache-Control": "public, max-age=900",
      });
      res.end(xml);
    } catch {
      res.writeHead(500, { "Content-Type": "text/plain; charset=utf-8" });
      res.end("Failed to build sitemap");
    }
    return;
  }

  const auctionMatch = urlPath.match(/^\/auction\/([^/]+)$/);
  if (auctionMatch && BOT_UA.test(ua)) {
    const id = decodeURIComponent(auctionMatch[1]);
    if (UUID_RE.test(id)) {
      try {
        const auction = await fetchAuctionForOg(id);
        const canonical = SITE_URL
          ? `${SITE_URL}/auction/${encodeURIComponent(id)}`
          : `/auction/${encodeURIComponent(id)}`;
        if (auction) {
          res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
          res.end(buildAuctionOgHtml(auction, canonical));
          return;
        }
      } catch {
        /* fall through to SPA */
      }
    }
  }

  const articleMatch = urlPath.match(/^\/article\/([^/]+)$/);
  if (articleMatch && BOT_UA.test(ua)) {
    const slug = decodeURIComponent(articleMatch[1]);
    if (SLUG_RE.test(slug)) {
      try {
        const article = await fetchArticleForOg(slug);
        const canonical = SITE_URL
          ? `${SITE_URL}/article/${encodeURIComponent(slug)}`
          : `/article/${encodeURIComponent(slug)}`;
        if (article) {
          res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
          res.end(buildArticleOgHtml(article, canonical));
          return;
        }
      } catch {
        /* fall through to SPA */
      }
    }
  }

  const filePath = resolveStaticPath(urlPath);
  if (filePath && fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
    sendFile(res, filePath);
    return;
  }

  if (looksLikeAsset(urlPath)) {
    res.writeHead(404);
    res.end("Not found");
    return;
  }

  if (fs.existsSync(path.join(DIST, "index.html"))) {
    sendSpa(res);
    return;
  }

  res.writeHead(404);
  res.end("Not found");
});

server.listen(PORT, "0.0.0.0", () => {
  console.log(`${APP_DISPLAY_NAME} web server listening on 0.0.0.0:${PORT}`);
  if (!isRedisConfigured()) {
    console.log("[redis] REDIS_URL not set — skipping");
    return;
  }
  void connectRedis().then(async (client) => {
    if (!client) return;
    const ok = await pingRedis();
    console.log(ok ? "[redis] ping ok" : "[redis] ping failed");
  });
});
