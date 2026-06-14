import { useState } from "react";
import { Alert, TextInput, View } from "react-native";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/src/lib/supabase";
import { useAuth } from "@/src/providers/AuthProvider";
import { useAppSettings } from "@/src/data/app-settings";
import { Screen } from "@/src/components/ui/Screen";
import { TextTitle } from "@/src/components/ui/TextTitle";
import { TextBody } from "@/src/components/ui/TextBody";
import { TextCaption } from "@/src/components/ui/TextCaption";
import { TextLabel } from "@/src/components/ui/TextLabel";
import { ButtonPrimary } from "@/src/components/ui/ButtonPrimary";
import { colors, radii, space } from "@/src/theme/tokens";

export default function AdminSettingsScreen() {
  const { profile } = useAuth();
  const qc = useQueryClient();
  const { data, refetch, isLoading } = useAppSettings();
  const [feeDraft, setFeeDraft] = useState<string | null>(null);
  const [featuredAmtDraft, setFeaturedAmtDraft] = useState<string | null>(null);
  const [acctNumDraft, setAcctNumDraft] = useState<string | null>(null);
  const [acctNameDraft, setAcctNameDraft] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const currentFee = data?.platform_fee_percent ?? 0;
  const feeInput = feeDraft !== null ? feeDraft : String(currentFee);

  const curFeatAmt = data?.featured_listing_fee_amount ?? 150;
  const curAcct = data?.featured_listing_fee_account_number ?? "";
  const curName = data?.featured_listing_fee_account_name ?? "";
  const featuredAmtInput = featuredAmtDraft !== null ? featuredAmtDraft : String(curFeatAmt);
  const acctNumInput = acctNumDraft !== null ? acctNumDraft : curAcct;
  const acctNameInput = acctNameDraft !== null ? acctNameDraft : curName;

  if (profile?.role !== "admin") {
    return (
      <Screen scroll>
        <TextTitle>Settings</TextTitle>
        <TextBody style={{ marginTop: space.lg }}>Admin only.</TextBody>
      </Screen>
    );
  }

  const inputStyle = {
    marginTop: space.sm,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.md,
    paddingHorizontal: space.lg,
    paddingVertical: space.md,
    fontSize: 17,
    color: colors.text,
    backgroundColor: colors.background,
  } as const;

  async function save() {
    const rawFee = (feeDraft !== null ? feeDraft : String(currentFee)).replace(",", ".").trim();
    const nFee = Number(rawFee);
    if (!Number.isFinite(nFee) || nFee < 0 || nFee > 100) {
      Alert.alert("Invalid fee", "Platform fee must be between 0 and 100.");
      return;
    }

    const rawFeat = (featuredAmtDraft !== null ? featuredAmtDraft : String(curFeatAmt))
      .replace(",", ".")
      .trim();
    const nFeat = Number(rawFeat);
    if (!Number.isFinite(nFeat) || nFeat < 0) {
      Alert.alert("Invalid amount", "Featured listing fee must be zero or positive.");
      return;
    }

    const acct = (acctNumDraft !== null ? acctNumDraft : curAcct).trim();
    const name = (acctNameDraft !== null ? acctNameDraft : curName).trim();
    if (!acct || !name) {
      Alert.alert("Payee details", "Account number and account name are required.");
      return;
    }

    setSaving(true);
    try {
      const { data: rpc, error } = await supabase.rpc("admin_update_app_settings", {
        p_platform_fee_percent: nFee,
        p_featured_listing_fee_amount: nFeat,
        p_featured_listing_fee_account_number: acct,
        p_featured_listing_fee_account_name: name,
      });
      if (error) {
        Alert.alert("Error", error.message);
        return;
      }
      if (rpc && typeof rpc === "object" && "ok" in rpc && rpc.ok === false) {
        Alert.alert("Error", String((rpc as { error?: string }).error));
        return;
      }
      setFeeDraft(null);
      setFeaturedAmtDraft(null);
      setAcctNumDraft(null);
      setAcctNameDraft(null);
      await refetch();
      qc.invalidateQueries({ queryKey: ["app-settings"] });
      Alert.alert("Saved", "Platform and featured listing fee settings updated.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Screen scroll>
      <TextTitle>Platform settings</TextTitle>
      <TextBody style={{ marginTop: space.sm, color: colors.textSecondary }}>
        These values are shown to sellers when they pay the featured listing fee and in winner disclosures
        for the platform fee.
      </TextBody>

      {isLoading ? <TextCaption style={{ marginTop: space.md }}>Loading…</TextCaption> : null}

      <TextLabel style={{ marginTop: space.xl }}>PLATFORM FEE (%)</TextLabel>
      <TextInput
        value={feeInput}
        onChangeText={(t) => setFeeDraft(t)}
        keyboardType="decimal-pad"
        placeholder="0"
        placeholderTextColor={colors.textMuted}
        style={inputStyle}
      />
      <TextCaption style={{ marginTop: space.xs }}>
        Current saved value: {String(currentFee)}%. Use 0 for no fee messaging.
      </TextCaption>

      <TextLabel style={{ marginTop: space.xl }}>FEATURED LISTING FEE (MVR)</TextLabel>
      <TextInput
        value={featuredAmtInput}
        onChangeText={(t) => setFeaturedAmtDraft(t)}
        keyboardType="decimal-pad"
        placeholder="150"
        placeholderTextColor={colors.textMuted}
        style={inputStyle}
      />

      <TextLabel style={{ marginTop: space.lg }}>LISTING FEE ACCOUNT NUMBER</TextLabel>
      <TextInput
        value={acctNumInput}
        onChangeText={(t) => setAcctNumDraft(t)}
        autoCapitalize="none"
        autoCorrect={false}
        placeholder="Bank account number"
        placeholderTextColor={colors.textMuted}
        style={inputStyle}
      />

      <TextLabel style={{ marginTop: space.lg }}>LISTING FEE ACCOUNT NAME</TextLabel>
      <TextInput
        value={acctNameInput}
        onChangeText={(t) => setAcctNameDraft(t)}
        placeholder="Payee name"
        placeholderTextColor={colors.textMuted}
        style={inputStyle}
      />
      <TextCaption style={{ marginTop: space.xs }}>
        Shown on the featured fee payment screen when sellers upload their transfer slip.
      </TextCaption>

      <ButtonPrimary
        title={saving ? "Saving…" : "Save settings"}
        onPress={save}
        disabled={saving}
        style={{ marginTop: space.xl }}
      />

      <View style={{ marginTop: space.xxl, height: 1, backgroundColor: colors.border }} />
      <TextCaption style={{ marginTop: space.lg }}>
        Row `app_settings` id=1. Updates are admin-only via RPC `admin_update_app_settings`.
      </TextCaption>
    </Screen>
  );
}
