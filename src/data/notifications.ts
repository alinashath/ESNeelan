import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/src/lib/supabase";
import type { NotificationRow } from "@/src/components/ui/NotificationCard";

export function useMyNotifications() {
  return useQuery({
    queryKey: ["notifications"],
    queryFn: async () => {
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user) return [] as NotificationRow[];
      const { data, error } = await supabase
        .from("notification_outbox")
        .select("id, type, payload, read_at, created_at")
        .eq("user_id", auth.user.id)
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) return [] as NotificationRow[];
      return (data ?? []) as NotificationRow[];
    },
  });
}

export function useUnreadNotificationCount() {
  return useQuery({
    queryKey: ["notifications", "unread-count"],
    queryFn: async () => {
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user) return 0;
      const { count, error } = await supabase
        .from("notification_outbox")
        .select("id", { count: "exact", head: true })
        .eq("user_id", auth.user.id)
        .is("read_at", null);
      if (error) return 0;
      return count ?? 0;
    },
  });
}

export async function markNotificationRead(id: string) {
  await supabase.from("notification_outbox").update({ read_at: new Date().toISOString() }).eq("id", id);
}
