import { Pressable, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { TextBody } from "./TextBody";
import { TextCaption } from "./TextCaption";
import { colors, radii, space } from "@/src/theme/tokens";
import { getNotificationDisplay, notificationTypeTitle } from "@/src/lib/notification-display";

export type NotificationRow = {
  id: string;
  type: string;
  payload: Record<string, unknown>;
  read_at: string | null;
  created_at: string;
};

type Props = {
  row: NotificationRow;
  onPress: () => void;
};

export function NotificationCard({ row, onPress }: Props) {
  const payload = row.payload ?? {};
  const { lotTitle, detailLines } = getNotificationDisplay(row.type, payload);
  const unread = !row.read_at;

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => ({
        borderWidth: 1,
        borderColor: colors.border,
        borderRadius: radii.lg,
        padding: space.md,
        marginBottom: space.sm,
        backgroundColor: unread ? colors.accentMuted : colors.background,
        opacity: pressed ? 0.92 : 1,
      })}
    >
      <View style={{ flexDirection: "row", gap: space.md, alignItems: "flex-start" }}>
        <View
          style={{
            width: 40,
            height: 40,
            borderRadius: radii.md,
            backgroundColor: colors.surfaceMuted,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Ionicons name="notifications-outline" size={22} color={colors.primary} />
        </View>
        <View style={{ flex: 1, minWidth: 0 }}>
          <TextBody style={{ fontWeight: "600" }} numberOfLines={2}>
            {notificationTypeTitle(row.type)}
          </TextBody>
          {lotTitle ? (
            <TextBody style={{ marginTop: 6, fontWeight: "600" }} numberOfLines={3}>
              {lotTitle}
            </TextBody>
          ) : null}
          {detailLines.map((line, i) => (
            <TextCaption
              key={`${row.id}-d-${i}`}
              style={{ marginTop: i === 0 && !lotTitle ? 6 : 4, lineHeight: 18 }}
              numberOfLines={4}
            >
              {line}
            </TextCaption>
          ))}
          <TextCaption style={{ marginTop: space.sm, color: colors.textMuted }}>
            {new Date(row.created_at).toLocaleString()}
          </TextCaption>
        </View>
        {unread ? (
          <View
            style={{
              width: 10,
              height: 10,
              borderRadius: 5,
              backgroundColor: colors.secondary,
              marginTop: 4,
            }}
          />
        ) : null}
      </View>
    </Pressable>
  );
}
