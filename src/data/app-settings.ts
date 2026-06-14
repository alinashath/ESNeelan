import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/src/lib/supabase";

export type AppSettingsRow = {
  id: number;
  platform_fee_percent: number;
  featured_listing_fee_amount: number;
  featured_listing_fee_account_number: string;
  featured_listing_fee_account_name: string;
  updated_at: string;
};

export function useAppSettings() {
  return useQuery({
    queryKey: ["app-settings"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("app_settings")
        .select(
          "id, platform_fee_percent, featured_listing_fee_amount, featured_listing_fee_account_number, featured_listing_fee_account_name, updated_at",
        )
        .eq("id", 1)
        .maybeSingle();
      if (error) throw error;
      return (data ?? {
        id: 1,
        platform_fee_percent: 0,
        featured_listing_fee_amount: 150,
        featured_listing_fee_account_number: "7730000000000",
        featured_listing_fee_account_name: "Feridhoo Holdings",
        updated_at: new Date().toISOString(),
      }) as AppSettingsRow;
    },
    staleTime: 60_000,
  });
}

export function formatPlatformFeeLine(percent: number): string {
  if (!Number.isFinite(percent) || percent <= 0) {
    return "No platform fee is charged on winning bids at this time.";
  }
  const p = new Intl.NumberFormat(undefined, {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(percent);
  return `A platform fee of ${p}% may apply to the winning bid amount (set by administrators).`;
}
