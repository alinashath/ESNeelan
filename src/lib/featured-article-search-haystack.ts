import type { FeaturedArticleBlock } from "@/src/lib/featured-article-blocks";

/** Concatenates title, excerpt, and all textual block fields (lowercased) for client-side search. */
export function buildFeaturedArticleSearchHaystack(input: {
  title: string;
  excerpt: string;
  blocks: FeaturedArticleBlock[];
}): string {
  const parts: string[] = [input.title, input.excerpt];
  for (const b of input.blocks) {
    switch (b.type) {
      case "heading":
        parts.push(b.text);
        break;
      case "paragraph":
        parts.push(b.text);
        break;
      case "quote":
        parts.push(b.text);
        if (b.attribution) parts.push(b.attribution);
        break;
      case "qa":
        parts.push(b.question, b.answer);
        break;
      case "phone":
        if (b.label) parts.push(b.label);
        parts.push(b.number);
        break;
      case "fact_card":
        parts.push(b.title, ...b.facts);
        break;
      case "photo":
        if (b.alt) parts.push(b.alt);
        parts.push(b.storage_path);
        break;
      case "inline_action":
        parts.push(b.label, b.href);
        if (b.auction_id) parts.push(String(b.auction_id));
        break;
      case "collection_embed":
        if (b.label) parts.push(b.label);
        parts.push(b.collection_id);
        break;
      default:
        break;
    }
  }
  return parts.join("\n").toLowerCase();
}

export function featuredArticleMatchesSearch(
  input: { title: string; excerpt: string; blocks: FeaturedArticleBlock[] },
  query: string,
): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  return buildFeaturedArticleSearchHaystack(input).includes(q);
}
