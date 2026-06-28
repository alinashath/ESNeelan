import { supabase } from "@/src/lib/supabase";

const AVATARS_BUCKET = "avatars";

const ALLOWED_CONTENT_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
]);

/** Map picker / browser mime values to types allowed on the `avatars` bucket. */
export function normalizeAvatarContentType(
  mimeType: string | null | undefined,
  uri: string,
): "image/jpeg" | "image/png" | "image/webp" {
  const raw = mimeType?.toLowerCase().trim() ?? "";
  if (raw === "image/jpg" || raw === "image/pjpeg") return "image/jpeg";
  if (raw === "image/heic" || raw === "image/heif") return "image/jpeg";
  if (ALLOWED_CONTENT_TYPES.has(raw)) {
    return raw as "image/jpeg" | "image/png" | "image/webp";
  }
  const lower = uri.toLowerCase();
  if (lower.includes(".png")) return "image/png";
  if (lower.includes(".webp")) return "image/webp";
  return "image/jpeg";
}

function extFromContentType(contentType: string): string {
  if (contentType === "image/png") return "png";
  if (contentType === "image/webp") return "webp";
  return "jpg";
}

/** Read local picker URI into bytes (web blob URLs + native file URIs). */
export async function readLocalImageBytes(uri: string): Promise<Uint8Array> {
  const res = await fetch(uri);
  if (!res.ok) {
    throw new Error(`Could not read the image (${res.status}).`);
  }
  const buf = await res.arrayBuffer();
  if (buf.byteLength === 0) {
    throw new Error("The selected image is empty.");
  }
  return new Uint8Array(buf);
}

export type UploadUserAvatarResult =
  | { ok: true; path: string; updatedAt: string }
  | { ok: false; error: string };

/**
 * Upload a new avatar for `userId`, update `profiles.avatar_storage_path`, and remove the prior file.
 */
export async function uploadUserAvatar(
  userId: string,
  localUri: string,
  mimeType: string | null | undefined,
  previousPath: string | null | undefined,
): Promise<UploadUserAvatarResult> {
  const contentType = normalizeAvatarContentType(mimeType, localUri);
  const ext = extFromContentType(contentType);
  const path = `${userId}/avatar-${Date.now()}.${ext}`;

  let body: Uint8Array;
  try {
    body = await readLocalImageBytes(localUri);
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : "Could not read the image.",
    };
  }

  const { error: upErr } = await supabase.storage.from(AVATARS_BUCKET).upload(path, body, {
    contentType,
    upsert: false,
    cacheControl: "3600",
  });
  if (upErr) {
    return { ok: false, error: upErr.message };
  }

  const { data, error: dbErr } = await supabase
    .from("profiles")
    .update({ avatar_storage_path: path })
    .eq("id", userId)
    .select("avatar_storage_path, updated_at")
    .single();

  if (dbErr) {
    await supabase.storage.from(AVATARS_BUCKET).remove([path]);
    return { ok: false, error: dbErr.message };
  }

  const prev = previousPath?.trim();
  if (prev && prev !== path) {
    await supabase.storage.from(AVATARS_BUCKET).remove([prev]);
  }

  return {
    ok: true,
    path: (data?.avatar_storage_path as string) ?? path,
    updatedAt: (data?.updated_at as string) ?? new Date().toISOString(),
  };
}

export async function removeUserAvatar(
  userId: string,
  storagePath: string | null | undefined,
): Promise<{ ok: true; updatedAt: string } | { ok: false; error: string }> {
  const prev = storagePath?.trim();
  if (prev) {
    await supabase.storage.from(AVATARS_BUCKET).remove([prev]);
  }

  const { data, error } = await supabase
    .from("profiles")
    .update({ avatar_storage_path: null })
    .eq("id", userId)
    .select("updated_at")
    .single();

  if (error) return { ok: false, error: error.message };
  return {
    ok: true,
    updatedAt: (data?.updated_at as string) ?? new Date().toISOString(),
  };
}
