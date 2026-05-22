import Constants from "expo-constants";

const extra = Constants.expoConfig?.extra as Record<string, string> | undefined;

export function getSupabaseFunctionsBaseUrl(): string {
  return (
    process.env.EXPO_PUBLIC_FUNCTIONS_URL ??
    extra?.functionsUrl ??
    (process.env.EXPO_PUBLIC_SUPABASE_URL
      ? `${process.env.EXPO_PUBLIC_SUPABASE_URL.replace(/\/$/, "")}/functions/v1`
      : "")
  );
}

export async function promoteAdminIfAllowed(accessToken: string) {
  const base = getSupabaseFunctionsBaseUrl();
  if (!base) return;
  const anon = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? "";
  await fetch(`${base}/promote-admin`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      apikey: anon,
    },
  });
}
