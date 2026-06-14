import { Alert, FlatList } from "react-native";
import { router, type Href } from "expo-router";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/src/providers/AuthProvider";
import { useMyNotifications, markNotificationRead } from "@/src/data/notifications";
import { NotificationCard, type NotificationRow } from "@/src/components/ui/NotificationCard";
import { formatNotificationAlertBody, notificationTypeTitle } from "@/src/lib/notification-display";
import { Screen } from "@/src/components/ui/Screen";
import { TextTitle } from "@/src/components/ui/TextTitle";
import { TextBody } from "@/src/components/ui/TextBody";
import { ButtonPrimary } from "@/src/components/ui/ButtonPrimary";
import { colors, space } from "@/src/theme/tokens";

export default function NotificationsTabScreen() {
  const { session } = useAuth();
  const qc = useQueryClient();
  const { data = [], refetch, isRefetching } = useMyNotifications();

  if (!session) {
    return (
      <Screen scroll>
        <TextTitle>Alerts</TextTitle>
        <ButtonPrimary title="Log in" onPress={() => router.push("/(auth)/login")} />
      </Screen>
    );
  }

  return (
    <Screen scroll={false}>
      <FlatList
        showsVerticalScrollIndicator={false}
        showsHorizontalScrollIndicator={false}
        data={data}
        keyExtractor={(item) => item.id}
        refreshing={isRefetching}
        onRefresh={() => void refetch()}
        contentContainerStyle={{
          paddingHorizontal: space.lg,
          paddingTop: space.md,
          paddingBottom: space.xxl,
        }}
        ListHeaderComponent={
          <TextTitle style={{ marginBottom: space.md }}>Alerts</TextTitle>
        }
        ListEmptyComponent={
          <TextBody style={{ color: colors.textMuted }}>You have no notifications yet.</TextBody>
        }
        renderItem={({ item }) => (
          <NotificationCard
            row={item}
            onPress={async () => {
              await markNotificationRead(item.id);
              void qc.invalidateQueries({ queryKey: ["notifications"] });
              void qc.invalidateQueries({ queryKey: ["notifications", "unread-count"] });
              const payload = item.payload as Record<string, unknown>;
              const aid = typeof payload.auction_id === "string" ? payload.auction_id : null;
              if (aid) {
                router.push(`/auction/${aid}` as Href);
              } else {
                Alert.alert(
                  notificationTypeTitle(item.type),
                  formatNotificationAlertBody(item.type, payload),
                );
              }
            }}
          />
        )}
      />
    </Screen>
  );
}
