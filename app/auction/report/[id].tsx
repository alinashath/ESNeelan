import { ButtonPrimary } from "@/src/components/ui/ButtonPrimary";
import { ButtonSecondary } from "@/src/components/ui/ButtonSecondary";
import { Chip } from "@/src/components/ui/Chip";
import { Screen } from "@/src/components/ui/Screen";
import { TextArea } from "@/src/components/ui/TextArea";
import { TextBody } from "@/src/components/ui/TextBody";
import { TextCaption } from "@/src/components/ui/TextCaption";
import { TextTitle } from "@/src/components/ui/TextTitle";
import { supabase } from "@/src/lib/supabase";
import { useAuth } from "@/src/providers/AuthProvider";
import { colors, space } from "@/src/theme/tokens";
import { useQueryClient } from "@tanstack/react-query";
import { router, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { Alert, View } from "react-native";

const CATEGORIES = ["Offensive content", "Harassment or abuse", "Fraud or scam", "Prohibited item", "Other"];

export default function ReportListingScreen() {
  const { id = "", sellerId = "" } = useLocalSearchParams<{ id: string; sellerId: string }>();
  const { session } = useAuth();
  const qc = useQueryClient();
  const [category, setCategory] = useState(CATEGORIES[0]);
  const [details, setDetails] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(block: boolean) {
    if (!session) { router.replace("/(auth)/login"); return; }
    setBusy(true);
    try {
      if (block) {
        const { error } = await supabase.rpc("block_and_report_user", {
          p_blocked_id: sellerId, p_auction_id: id, p_category: category, p_body: details.trim() || category,
        });
        if (error) throw error;
        await qc.invalidateQueries();
        Alert.alert("User blocked and report sent", "Their listings have been removed from your feed. Our safety team will review the report within 24 hours.", [
          { text: "Done", onPress: () => router.replace("/(tabs)") },
        ]);
      } else {
        const { error } = await supabase.from("complaints").insert({
          reporter_id: session.user.id, auction_id: id, reported_user_id: sellerId, category, body: details.trim() || category,
        });
        if (error) throw error;
        Alert.alert("Report sent", "Our safety team will review it within 24 hours.", [{ text: "Done", onPress: () => router.back() }]);
      }
    } catch (e) {
      Alert.alert("Could not send report", e instanceof Error ? e.message : "Please try again.");
    } finally { setBusy(false); }
  }

  return (
    <Screen scroll>
      <TextTitle>Report this listing</TextTitle>
      <TextBody style={{ marginTop: space.md, color: colors.textSecondary }}>
        Reports are confidential and reviewed within 24 hours. If content violates our zero-tolerance policy, we remove it and eject the offending user.
      </TextBody>
      <TextCaption style={{ marginTop: space.xl }}>WHAT IS WRONG?</TextCaption>
      <View style={{ marginTop: space.sm, flexDirection: "row", flexWrap: "wrap", gap: space.sm }}>
        {CATEGORIES.map((item) => <Chip key={item} title={item} selected={category === item} onPress={() => setCategory(item)} />)}
      </View>
      <TextArea label="DETAILS (OPTIONAL)" value={details} onChangeText={setDetails} maxLength={2000} placeholder="Tell us what happened." style={{ marginTop: space.lg }} />
      <ButtonPrimary title="Submit report" loading={busy} onPress={() => submit(false)} />
      <ButtonSecondary title="Block user & submit report" disabled={busy} onPress={() => submit(true)} style={{ marginTop: space.md }} />
      <TextCaption style={{ marginTop: space.sm, color: colors.textMuted }}>
        Blocking instantly removes this user's listings from your feed and also notifies our safety team.
      </TextCaption>
    </Screen>
  );
}
