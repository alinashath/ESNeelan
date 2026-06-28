/**
 * Removes empty react-helmet title placeholders from static export HTML.
 * Expo Router SSR emits `<title data-rh="true"></title>` before the +html title,
 * which makes browsers show a blank tab label until client JS runs.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DIST = path.join(__dirname, "..", "dist");

const EMPTY_HELMET_TITLE = /<title data-rh="true"><\/title>/g;

function fixHtml(filePath) {
  const html = fs.readFileSync(filePath, "utf8");
  const next = html.replace(EMPTY_HELMET_TITLE, "");
  if (next !== html) {
    fs.writeFileSync(filePath, next);
  }
}

function walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walk(fullPath);
      continue;
    }
    if (entry.name.endsWith(".html")) {
      fixHtml(fullPath);
    }
  }
}

if (!fs.existsSync(DIST)) {
  console.error("Missing dist/ — run expo export first");
  process.exit(1);
}

walk(DIST);
console.log("Stripped empty helmet titles from dist/*.html");
