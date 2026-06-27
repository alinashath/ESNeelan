import { useCallback } from "react";
import { Alert, Platform, Pressable, Share, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { sharePublicLink } from "@/src/lib/share-listing";
import { colors, radii, space } from "@/src/theme/tokens";

type Props = {
  title: string;
  url: string;
  excerpt?: string;
  /** Compact icon-only hit for stack header */
  variant?: "inline" | "header";
};

function buildShareMessage(title: string, excerpt?: string): string {
  return excerpt?.trim() ? `${title}\n\n${excerpt.trim()}` : title;
}

async function runShare(title: string, url: string, excerpt?: string) {
  await sharePublicLink({
    title,
    message: buildShareMessage(title, excerpt),
    url,
    copiedMessage: "Story link copied to clipboard.",
  });
}

async function copyLink(url: string) {
  try {
    if (Platform.OS === "web") {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(url);
        Alert.alert("Copied", "Story link copied to clipboard.");
        return;
      }
      window.prompt("Copy this link:", url);
      return;
    }
    await Share.share({ message: url });
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
        accessibilityLabel="Share story"
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
        accessibilityLabel="Share story"
        onPress={onShare}
        style={({ pressed }) => [styles.btn, pressed && styles.pressed]}
      >
        <Ionicons name="share-social-outline" size={18} color={colors.primary} />
        <Text style={styles.btnLabel}>Share</Text>
      </Pressable>
      {Platform.OS === "web" ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Copy story link"
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
