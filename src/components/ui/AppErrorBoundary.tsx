import { Ionicons } from "@expo/vector-icons";
import { Platform, Pressable, StyleSheet, Text, View } from "react-native";

import { palette } from "@/src/theme/tokens";

type ErrorBoundaryProps = {
  error: Error;
  retry: () => Promise<void>;
};

/**
 * Branded fallback for the Expo Router error boundary.
 *
 * The default boundary renders a bare (often dark) screen with a raw stack
 * trace, which is what surfaced as the "black screen with error message" on the
 * production web build. Here we show a friendly, on-brand recovery screen and
 * only expose the raw error text in development.
 */
export function AppErrorBoundary({ error, retry }: ErrorBoundaryProps) {
  const showDetails = __DEV__;

  const reload = () => {
    if (Platform.OS === "web" && typeof window !== "undefined") {
      window.location.reload();
      return;
    }
    void retry();
  };

  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <View style={styles.iconWell}>
          <Ionicons name="alert-circle-outline" size={34} color={palette.primary} />
        </View>
        <Text style={styles.title}>Something went wrong</Text>
        <Text style={styles.body}>
          We hit an unexpected problem loading this page. Please try again — if it
          keeps happening, refreshing usually fixes it.
        </Text>

        {showDetails && error?.message ? (
          <Text style={styles.details} selectable>
            {error.message}
          </Text>
        ) : null}

        <Pressable
          onPress={reload}
          style={({ pressed }) => [styles.button, pressed && styles.buttonPressed]}
          accessibilityRole="button"
          accessibilityLabel="Reload the page"
        >
          <Ionicons name="refresh" size={18} color={palette.primaryOnDark} />
          <Text style={styles.buttonLabel}>Try again</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
    backgroundColor: palette.canvasParchment,
  },
  card: {
    width: "100%",
    maxWidth: 420,
    alignItems: "center",
    gap: 14,
  },
  iconWell: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(230, 0, 35, 0.08)",
  },
  title: {
    fontSize: 22,
    fontWeight: "700",
    color: palette.ink,
    textAlign: "center",
  },
  body: {
    fontSize: 15,
    lineHeight: 22,
    color: palette.inkMuted80,
    textAlign: "center",
  },
  details: {
    marginTop: 4,
    fontSize: 12,
    lineHeight: 18,
    color: palette.inkMuted48,
    textAlign: "center",
    fontFamily: Platform.OS === "ios" ? "Menlo" : "monospace",
  },
  button: {
    marginTop: 8,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 22,
    borderRadius: 999,
    backgroundColor: palette.primary,
  },
  buttonPressed: {
    backgroundColor: palette.primaryPressed,
  },
  buttonLabel: {
    fontSize: 15,
    fontWeight: "600",
    color: palette.primaryOnDark,
  },
});
