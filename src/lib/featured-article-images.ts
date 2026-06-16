import { supabase } from "@/src/lib/supabase";
import { storagePublicUrl } from "@/src/lib/storage-url";

export const FEATURED_ARTICLE_IMAGES_BUCKET = "featured-article-images";

export function featuredArticleImagePublicUrl(storagePath: string): string {
  return storagePublicUrl(FEATURED_ARTICLE_IMAGES_BUCKET, storagePath);
}

/** Cover: prefer uploaded storage path, else external URL from `cover_image_url`. */
export function resolveFeaturedArticleCoverDisplayUrl(
  storagePath: string | null | undefined,
  externalUrl: string | null | undefined,
): string | null {
  const sp = storagePath?.trim();
  if (sp) {
    const u = featuredArticleImagePublicUrl(sp);
    return u || null;
  }
  const ext = externalUrl?.trim();
  return ext || null;
}

function extFromMime(mime: string): string {
  if (mime === "image/png") return "png";
  if (mime === "image/webp") return "webp";
  if (mime === "image/heic" || mime === "image/heif") return "jpg";
  return "jpg";
}

/**
 * Upload an image for a featured article (cover or block). Path: `{articleId}/{unique}.{ext}`.
 */
export async function uploadFeaturedArticleImage(
  articleId: string,
  localUri: string,
  mime: string,
): Promise<{ path: string } | { error: string }> {
  const safeId = articleId.trim();
  if (!safeId) return { error: "Missing article id" };
  const ext = extFromMime(mime);
  const path = `${safeId}/${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
  const res = await fetch(localUri);
  if (!res.ok) return { error: `Could not read image (${res.status})` };
  const body = new Uint8Array(await res.arrayBuffer());
  const { error } = await supabase.storage
    .from(FEATURED_ARTICLE_IMAGES_BUCKET)
    .upload(path, body, { upsert: false, contentType: mime || "image/jpeg" });
  if (error) return { error: error.message };
  return { path };
}

export async function removeFeaturedArticleImage(storagePath: string): Promise<void> {
  const p = storagePath.trim();
  if (!p) return;
  await supabase.storage.from(FEATURED_ARTICLE_IMAGES_BUCKET).remove([p]);
}
