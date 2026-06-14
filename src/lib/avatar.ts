import { supabase } from "@/src/lib/supabase";

/** Public `avatars` bucket URL (object must exist; path is `{userId}/avatar.ext`). */
export function getAvatarPublicUrl(storagePath: string | null | undefined): string | null {
  const path = storagePath?.trim().replace(/^\/+/, "");
  if (!path) return null;
  const { data } = supabase.storage.from("avatars").getPublicUrl(path);
  return data.publicUrl;
}
