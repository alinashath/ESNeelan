/**
 * Production web server: static `dist/` + SPA fallback + OG HTML for social crawlers.
 */
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DIST = path.join(__dirname, "..", "dist");
const PORT = Number(process.env.PORT) || 8080;

const SUPABASE_URL = (process.env.EXPO_PUBLIC_SUPABASE_URL || "").replace(/\/$/, "");
const SUPABASE_ANON = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || "";
const SITE_URL = (process.env.EXPO_PUBLIC_SITE_URL || "").replace(/\/$/, "");
const DEFAULT_OG_IMAGE = (process.env.EXPO_PUBLIC_DEFAULT_OG_IMAGE_URL || "").trim();

const BOT_UA =
  /facebookexternalhit|Facebot|Twitterbot|WhatsApp|Slackbot|LinkedInBot|Discordbot|TelegramBot|Pinterest|Googlebot|bingbot/i;

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json",
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

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
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

async function fetchAuctionForOg(id) {
  if (!SUPABASE_URL || !SUPABASE_ANON) return null;
  const url = new URL(`${SUPABASE_URL}/rest/v1/auctions`);
  url.searchParams.set("id", `eq.${id}`);
  url.searchParams.set(
    "select",
    "title,description,current_highest_bid,starting_price,bid_count,auction_images(storage_path,sort_order)",
  );
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

function buildOgHtml(auction, canonicalUrl) {
  const title = auction.title || "Auction";
  const pageTitle = `${title} | ES Neelan`;
  const currentBid = auction.current_highest_bid ?? auction.starting_price ?? 0;
  const bidCount = auction.bid_count ?? 0;
  const subtitle = `Current bid MVR ${formatMoneyAmount(currentBid)} · ${bidCount} ${bidCount === 1 ? "bid" : "bids"}`;
  const descBits = [plainTextSnippet(auction.description || "", 280), subtitle].filter(Boolean);
  const desc =
    descBits.length > 0
      ? plainTextSnippet(descBits.join(" — "), 300)
      : "Browse live auctions on ES Neelan — the Maldives auction marketplace.";

  const imgs = [...(auction.auction_images || [])].sort(
    (a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0),
  );
  const firstPath = imgs[0]?.storage_path;
  const ogImage = (firstPath ? storagePublicUrl("auction-images", firstPath) : "") || DEFAULT_OG_IMAGE;
  const card = ogImage ? "summary_large_image" : "summary";

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8"/>
  <title>${escapeHtml(pageTitle)}</title>
  <meta name="description" content="${escapeHtml(desc)}"/>
  <meta property="og:site_name" content="ES Neelan"/>
  <meta property="og:type" content="website"/>
  <meta property="og:title" content="${escapeHtml(pageTitle)}"/>
  <meta property="og:description" content="${escapeHtml(desc)}"/>
  <meta property="og:url" content="${escapeHtml(canonicalUrl)}"/>
  ${ogImage ? `<meta property="og:image" content="${escapeHtml(ogImage)}"/>` : ""}
  ${ogImage ? `<meta property="og:image:alt" content="${escapeHtml(title)}"/>` : ""}
  <meta name="twitter:card" content="${card}"/>
  <meta name="twitter:title" content="${escapeHtml(pageTitle)}"/>
  <meta name="twitter:description" content="${escapeHtml(desc)}"/>
  ${ogImage ? `<meta name="twitter:image" content="${escapeHtml(ogImage)}"/>` : ""}
  <meta http-equiv="refresh" content="0;url=${escapeHtml(canonicalUrl)}"/>
</head>
<body><p><a href="${escapeHtml(canonicalUrl)}">View auction on ES Neelan</a></p></body>
</html>`;
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
          res.end(buildOgHtml(auction, canonical));
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
  console.log(`ES Neelan web server listening on 0.0.0.0:${PORT}`);
});
