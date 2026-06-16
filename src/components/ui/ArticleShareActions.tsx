import { useCallback } from "react";
import { Alert, Platform, Pressable, Share, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { colors, radii, space } from "@/src/theme/tokens";

type Props = {
  title: string;
  url: string;
  excerpt?: string;
  /** Compact icon-only hit for stack header */
  variant?: "inline" | "header";
};

async function runShare(title: string, url: string, excerpt?: string) {
  const text = excerpt?.trim() ? `${title}\n\n${excerpt.trim()}\n\n${url}` : `${title}\n\n${url}`;
  try {
    if (Platform.OS === "web") {
      if (typeof navigator !== "undefined" && navigator.share) {
        await navigator.share({ title, text: excerpt?.trim() ?? title, url });
        return;
      }
      if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(url);
        Alert.alert("Copied", "Article link copied to clipboard.");
        return;
      }
      window.prompt("Copy this link:", url);
      return;
    }
    await Share.share(
      { title, message: text, url },
      { subject: title, dialogTitle: title },
    );
  } catch (e) {
    if ((e as { name?: string })?.name === "AbortError") return;
    Alert.alert("Share", "Could not open the share sheet. Try again.");
  }
}

async function copyLink(url: string) {
  try {
    if (Platform.OS === "web") {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(url);
        Alert.alert("Copied", "Article link copied to clipboard.");
        return;
      }
      window.prompt("Copy this link:", url);
      return;
    }
    await Share.share({ message: url, url });
  } catch {
    Alert.alert("Copy link", "Could not copy the link.");
  }
}

export function ArticleShareActions({ title, url, excerpt, variant = "inline" }: Props) {
  const onShare = useCallback(() => void runShare(title, url, excerpt), [title, url, excerpt]);
  const onCopy = useCallback(() => void copyLink(url), [url]);

  if (variant === "header") {
    return (
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Share article"
        onPress={onShare}
        style={({ pressed }) => [styles.headerHit, pressed && { opacity: 0.75 }]}
      >
        <Ionicons name="share-outline" size={22} color={colors.primary} />
      </Pressable>
    );
  }

  return (
    <View style={styles.row}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Share article"
        onPress={onShare}
        style={({ pressed }) => [styles.btn, pressed && styles.pressed]}
      >
        <Ionicons name="share-social-outline" size={18} color={colors.primary} />
        <Text style={styles.btnLabel}>Share</Text>
      </Pressable>
      {Platform.OS === "web" ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Copy article link"
          onPress={onCopy}
          style={({ pressed }) => [styles.btn, pressed && styles.pressed]}
        >
          <Ionicons name="link-outline" size={18} color={colors.primary} />
          <Text style={styles.btnLabel}>Copy link</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    gap: space.sm,
    marginTop: space.md,
  },
  btn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingVertical: space.sm,
    paddingHorizontal: space.md,
    borderRadius: radii.sm,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.background,
  },
  pressed: {
    backgroundColor: colors.surfaceMuted,
  },
  btnLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: colors.primary,
  },
  headerHit: {
    paddingHorizontal: space.md,
    paddingVertical: space.sm,
    marginRight: space.xs,
    justifyContent: "center",
    alignItems: "center",
    minWidth: 44,
    minHeight: 44,
  },
});
