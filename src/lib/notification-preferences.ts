import { useCallback, useEffect, useState } from "react";
import * as SecureStore from "expo-secure-store";

const KEY = "bidmaster_notification_prefs_v1";

export type NotificationPrefs = {
  /** Reminders before an auction you follow ends */
  auctionEnding: boolean;
  /** When someone outbids you */
  outbidAlerts: boolean;
  /** Product tips and AUC updates */
  marketingEmail: boolean;
};

const DEFAULTS: NotificationPrefs = {
  auctionEnding: true,
  outbidAlerts: true,
  marketingEmail: false,
};

export function useNotificationPreferences() {
  const [prefs, setPrefsState] = useState<NotificationPrefs>(DEFAULTS);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const raw = await SecureStore.getItemAsync(KEY);
        if (cancelled) return;
        if (raw) {
          const parsed = JSON.parse(raw) as Partial<NotificationPrefs>;
          setPrefsState({ ...DEFAULTS, ...parsed });
        }
      } catch {
        /* ignore */
      } finally {
        if (!cancelled) setLoaded(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const setPrefs = useCallback(async (next: NotificationPrefs) => {
    setPrefsState(next);
    await SecureStore.setItemAsync(KEY, JSON.stringify(next));
  }, []);

  return { prefs, setPrefs, loaded };
}
