/**
 * Rich blocks for admin-authored featured articles.
 * Stored as JSON array in `featured_articles.blocks`.
 */

export const FEATURED_ARTICLE_BLOCK_TYPES = [
  "heading",
  "paragraph",
  "quote",
  "qa",
  "phone",
  "fact_card",
  "photo",
  "inline_action",
] as const;

export type FeaturedArticleBlockType = (typeof FEATURED_ARTICLE_BLOCK_TYPES)[number];

export type FeaturedArticlePhotoPlacement = "contained" | "wide" | "bleed";

export type FeaturedArticleBlock =
  | { type: "heading"; text: string; level?: 1 | 2 | 3 }
  | { type: "paragraph"; text: string }
  | { type: "quote"; text: string; attribution?: string }
  | { type: "qa"; question: string; answer: string }
  | { type: "phone"; label?: string; number: string }
  | { type: "fact_card"; title: string; facts: string[] }
  | {
      type: "photo";
      /** Path in `featured-article-images` bucket (`{article_id}/…`). */
      storage_path: string;
      alt?: string;
      placement: FeaturedArticlePhotoPlacement;
    }
  | {
      type: "inline_action";
      label: string;
      href: string;
      /** When set, embed this listing in the article (searchable in admin). */
      auction_id?: string | null;
      /** Visual treatment for the embedded auction. */
      auction_display?: "row" | "card" | "large_card";
    };

export function emptyBlockForType(type: FeaturedArticleBlockType): FeaturedArticleBlock {
  switch (type) {
    case "heading":
      return { type: "heading", text: "", level: 2 };
    case "paragraph":
      return { type: "paragraph", text: "" };
    case "quote":
      return { type: "quote", text: "", attribution: "" };
    case "qa":
      return { type: "qa", question: "", answer: "" };
    case "phone":
      return { type: "phone", label: "Contact", number: "" };
    case "fact_card":
      return { type: "fact_card", title: "At a glance", facts: [""] };
    case "photo":
      return { type: "photo", storage_path: "", alt: "", placement: "contained" };
    case "inline_action":
      return {
        type: "inline_action",
        label: "Learn more",
        href: "/(tabs)/explore",
        auction_id: null,
        auction_display: undefined,
      };
    default: {
      const _x: never = type;
      return _x;
    }
  }
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

function asString(v: unknown): string {
  return typeof v === "string" ? v : "";
}

function asLevel(v: unknown): 1 | 2 | 3 | undefined {
  if (v === 1 || v === 2 || v === 3) return v;
  return undefined;
}

/** Coerce unknown JSON into valid blocks; drops malformed entries. */
export function parseFeaturedArticleBlocks(raw: unknown): FeaturedArticleBlock[] {
  if (!Array.isArray(raw)) return [];
  const out: FeaturedArticleBlock[] = [];
  for (const item of raw) {
    if (!isRecord(item)) continue;
    const type = item.type;
    switch (type) {
      case "heading":
        out.push({ type: "heading", text: asString(item.text), level: asLevel(item.level) ?? 2 });
        break;
      case "paragraph":
        out.push({ type: "paragraph", text: asString(item.text) });
        break;
      case "quote":
        out.push({
          type: "quote",
          text: asString(item.text),
          attribution: asString(item.attribution) || undefined,
        });
        break;
      case "qa":
        out.push({ type: "qa", question: asString(item.question), answer: asString(item.answer) });
        break;
      case "phone":
        out.push({
          type: "phone",
          label: asString(item.label) || undefined,
          number: asString(item.number),
        });
        break;
      case "fact_card": {
        const factsRaw = item.facts;
        const facts = Array.isArray(factsRaw)
          ? factsRaw.map((f) => asString(f)).filter((s) => s.length > 0)
          : [];
        out.push({
          type: "fact_card",
          title: asString(item.title) || "Facts",
          facts: facts.length ? facts : [""],
        });
        break;
      }
      case "photo": {
        const placementRaw = asString(item.placement);
        const placement: FeaturedArticlePhotoPlacement =
          placementRaw === "wide" || placementRaw === "bleed" ? placementRaw : "contained";
        out.push({
          type: "photo",
          storage_path: asString(item.storage_path),
          alt: asString(item.alt) || undefined,
          placement,
        });
        break;
      }
      case "inline_action": {
        const auctionIdRaw = asString(item.auction_id).trim();
        const auction_id = auctionIdRaw.length ? auctionIdRaw : null;
        const displayRaw = asString(item.auction_display);
        const auction_display =
          displayRaw === "row" || displayRaw === "card" || displayRaw === "large_card"
            ? displayRaw
            : ("card" as const);
        out.push({
          type: "inline_action",
          label: asString(item.label) || "Open",
          href:
            asString(item.href) ||
            (auction_id ? `/auction/${auction_id}` : "/"),
          auction_id,
          auction_display: auction_id ? auction_display : undefined,
        });
        break;
      }
      default:
        break;
    }
  }
  return out;
}

export function slugifyTitle(title: string, suffix?: string): string {
  const base = title
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
  const core = base.length ? base : "article";
  return suffix ? `${core}-${suffix}` : core;
}
