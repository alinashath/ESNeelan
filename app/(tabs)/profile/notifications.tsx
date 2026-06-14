import { useCallback, useEffect, useState } from "react";
import { Alert, Switch, View } from "react-native";
import { Screen } from "@/src/components/ui/Screen";
import { TextBody } from "@/src/components/ui/TextBody";
import { TextCaption } from "@/src/components/ui/TextCaption";
import { TextTitle } from "@/src/components/ui/TextTitle";
import { ButtonPrimary } from "@/src/components/ui/ButtonPrimary";
import {
  useNotificationPreferences,
  type NotificationPrefs,
} from "@/src/lib/notification-preferences";
import { colors, radii, space } from "@/src/theme/tokens";

function Row({
  title,
  description,
  value,
  onValueChange,
  showDivider,
}: {
  title: string;
  description: string;
  value: boolean;
  onValueChange: (v: boolean) => void;
  showDivider?: boolean;
}) {
  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        paddingVertical: space.lg,
        borderBottomWidth: showDivider ? 1 : 0,
        borderBottomColor: colors.border,
        gap: space.md,
      }}
    >
      <View style={{ flex: 1, minWidth: 0 }}>
        <TextBody style={{ fontWeight: "600" }}>{title}</TextBody>
        <TextCaption style={{ marginTop: 4, lineHeight: 18 }}>{description}</TextCaption>
      </View>
      <Switch
        value={value}
        onValueChange={onValueChange}
        trackColor={{ false: colors.border, true: colors.accent }}
        thumbColor={colors.white}
        accessibilityLabel={title}
      />
    </View>
  );
}

export default function NotificationSettingsScreen() {
  const { prefs, setPrefs, loaded } = useNotificationPreferences();
  const [draft, setDraft] = useState<NotificationPrefs>(prefs);

  useEffect(() => {
    if (loaded) setDraft(prefs);
  }, [loaded, prefs]);

  const update = useCallback((patch: Partial<NotificationPrefs>) => {
    setDraft((d) => ({ ...d, ...patch }));
  }, []);

  async function save() {
    await setPrefs(draft);
    Alert.alert("Saved", "Notification preferences stored on this device.");
  }

  return (
    <Screen scroll>
      <TextTitle style={{ fontSize: 22 }}>Notifications</TextTitle>
      <TextCaption style={{ marginTop: space.sm, color: colors.textMuted, lineHeight: 20 }}>
        Choose what you want to hear about. Push delivery will use these preferences when notifications go live.
      </TextCaption>

      <View
        style={{
          marginTop: space.xl,
          borderRadius: radii.lg,
          borderWidth: 1,
          borderColor: colors.border,
          paddingHorizontal: space.lg,
          backgroundColor: colors.background,
        }}
      >
        <Row
          title="Auction ending reminders"
          description="Heads-up before auctions you care about are about to close."
          value={draft.auctionEnding}
          onValueChange={(v) => update({ auctionEnding: v })}
          showDivider
        />
        <Row
          title="Outbid alerts"
          description="When another bidder tops your offer."
          value={draft.outbidAlerts}
          onValueChange={(v) => update({ outbidAlerts: v })}
          showDivider
        />
        <Row
          title="Tips & updates"
          description="Occasional product news from ES Neelan (no spam)."
          value={draft.marketingEmail}
          onValueChange={(v) => update({ marketingEmail: v })}
        />
      </View>

      <ButtonPrimary title="Save preferences" onPress={() => void save()} style={{ marginTop: space.xl }} />
    </Screen>
  );
}
