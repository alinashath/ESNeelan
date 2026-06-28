/**
 * Copies brand mark into `public/` for web favicon + apple-touch-icon.
 * `app.json` web.favicon still drives `favicon.ico` on export/dev.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");
const brandIcon = path.join(root, "assets/images/brand-icon.png");
const publicDir = path.join(root, "public");

if (!fs.existsSync(brandIcon)) {
  console.error("Missing brand icon:", brandIcon);
  process.exit(1);
}

fs.mkdirSync(publicDir, { recursive: true });

const faviconPng = path.join(publicDir, "favicon.png");
const appleTouch = path.join(publicDir, "apple-touch-icon.png");

await sharp(brandIcon).resize(48, 48).png().toFile(faviconPng);
await sharp(brandIcon).resize(180, 180).png().toFile(appleTouch);

// Keep assets/images/favicon.png aligned for app.json web.favicon → favicon.ico generation.
const appFavicon = path.join(root, "assets/images/favicon.png");
fs.copyFileSync(faviconPng, appFavicon);

console.log("Synced web icons from brand-icon.png");
