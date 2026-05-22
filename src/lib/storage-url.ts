export function storagePublicUrl(bucket: string, path: string): string {
  const base = process.env.EXPO_PUBLIC_SUPABASE_URL?.replace(/\/$/, "");
  if (!base) return "";
  return `${base}/storage/v1/object/public/${bucket}/${path}`;
}
