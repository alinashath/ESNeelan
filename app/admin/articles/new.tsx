import { useState } from "react";
import { ActivityIndicator, Alert, View } from "react-native";
import { router, type Href } from "expo-router";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/src/lib/supabase";
import { slugifyTitle } from "@/src/lib/featured-article-blocks";
import { Screen } from "@/src/components/ui/Screen";
import { TextTitle } from "@/src/components/ui/TextTitle";
import { TextBody } from "@/src/components/ui/TextBody";
import { ButtonPrimary } from "@/src/components/ui/ButtonPrimary";
import { useAuth } from "@/src/providers/AuthProvider";
import { colors, space } from "@/src/theme/tokens";

export default function AdminNewFeaturedArticleScreen() {
  const { profile } = useAuth();
  const qc = useQueryClient();
  const [busy, setBusy] = useState(false);

  async function create() {
    if (!profile?.id || profile.role !== "admin") return;
    setBusy(true);
    try {
      const slug = slugifyTitle("article", `${Date.now().toString(36)}`);
      const { data, error } = await supabase
        .from("featured_articles")
        .insert({
          slug,
          title: "Untitled article",
          excerpt: "",
          blocks: [],
          status: "draft",
          created_by: profile.id,
        })
        .select("id")
        .single();
      if (error) {
        Alert.alert("Could not create", error.message);
        return;
      }
      const row = data as { id?: string } | null;
      if (!row?.id) {
        Alert.alert("Could not create", "Missing id from server.");
        return;
      }
      await qc.invalidateQueries({ queryKey: ["admin", "featured-articles"] });
      router.replace(`/admin/articles/${row.id}` as Href);
    } finally {
      setBusy(false);
    }
  }

  if (profile?.role !== "admin") {
    return (
      <Screen scroll>
        <TextTitle>New article</TextTitle>
        <TextBody style={{ marginTop: space.lg }}>Admin only.</TextBody>
      </Screen>
    );
  }

  return (
    <Screen scroll>
      <TextTitle style={{ marginBottom: space.sm }}>New article</TextTitle>
      <TextBody style={{ marginBottom: space.lg, color: colors.textSecondary }}>
        Creates a draft with a temporary slug. You can rename the slug and add blocks on the next
        screen.
      </TextBody>
      <ButtonPrimary
        title={busy ? "Creating…" : "Create draft"}
        loading={busy}
        disabled={busy}
        onPress={() => void create()}
      />
      {busy ? (
        <View style={{ marginTop: space.lg, alignItems: "center" }}>
          <ActivityIndicator color={colors.accent} />
        </View>
      ) : null}
    </Screen>
  );
}
