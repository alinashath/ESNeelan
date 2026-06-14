import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  Pressable,
  View,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import { supabase } from "@/src/lib/supabase";
import { getAvatarPublicUrl } from "@/src/lib/avatar";
import { useAuth, type ProfileAccountType } from "@/src/providers/AuthProvider";
import { TextBody } from "@/src/components/ui/TextBody";
import { TextCaption } from "@/src/components/ui/TextCaption";
import { TextField } from "@/src/components/ui/TextField";
import { TextLabel } from "@/src/components/ui/TextLabel";
import { ButtonPrimary } from "@/src/components/ui/ButtonPrimary";
import { ButtonSecondary } from "@/src/components/ui/ButtonSecondary";
import { colors, radii, space } from "@/src/theme/tokens";

function normalizeAccountType(v: string | null | undefined): ProfileAccountType {
  return v === "business" ? "business" : "individual";
}

/** Full profile + avatar editor — use on `(tabs)/profile/edit` only. */
export function ProfileEditorForm() {
  const { session, profile, refreshProfile } = useAuth();
  const [name, setName] = useState("");
  const [accountType, setAccountType] = useState<ProfileAccountType>("individual");
  const [contactEmail, setContactEmail] = useState("");
  const [locationText, setLocationText] = useState("");
  const [address1, setAddress1] = useState("");
  const [address2, setAddress2] = useState("");
  const [city, setCity] = useState("");
  const [postalCode, setPostalCode] = useState("");
  const [saving, setSaving] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  const syncFromProfile = useCallback(() => {
    if (!profile) return;
    setName(profile.display_name ?? "");
    setAccountType(normalizeAccountType(profile.account_type));
    setContactEmail(profile.contact_email ?? "");
    setLocationText(profile.location_text ?? "");
    setAddress1(profile.address_line1 ?? "");
    setAddress2(profile.address_line2 ?? "");
    setCity(profile.city ?? "");
    setPostalCode(profile.postal_code ?? "");
  }, [profile]);

  useEffect(() => {
    syncFromProfile();
  }, [syncFromProfile]);

  const avatarUri = useMemo(
    () => getAvatarPublicUrl(profile?.avatar_storage_path),
    [profile?.avatar_storage_path],
  );

  async function pickAvatar() {
    if (!session) return;
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert("Photos", "Allow photo library access to set a profile image.");
      return;
    }
    const picked = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.75,
    });
    if (picked.canceled || !picked.assets?.[0]) return;
    const asset = picked.assets[0];
    setUploadingAvatar(true);
    try {
      const extFromMime =
        asset.mimeType === "image/png"
          ? "png"
          : asset.mimeType === "image/webp"
            ? "webp"
            : "jpg";
      const path = `${session.user.id}/avatar.${extFromMime}`;
      const mime = asset.mimeType ?? "image/jpeg";

      const res = await fetch(asset.uri);
      if (!res.ok) {
        Alert.alert("Upload", `Could not read the image (${res.status}).`);
        return;
      }
      const body = new Uint8Array(await res.arrayBuffer());
      const { error: upErr } = await supabase.storage
        .from("avatars")
        .upload(path, body, { upsert: true, contentType: mime });
      if (upErr) {
        Alert.alert("Upload", upErr.message);
        return;
      }
      const { error: dbErr } = await supabase
        .from("profiles")
        .update({ avatar_storage_path: path })
        .eq("id", session.user.id);
      if (dbErr) {
        Alert.alert("Profile", dbErr.message);
        return;
      }
      await refreshProfile();
    } finally {
      setUploadingAvatar(false);
    }
  }

  async function removeAvatar() {
    if (!session || !profile?.avatar_storage_path) return;
    setUploadingAvatar(true);
    try {
      await supabase.storage.from("avatars").remove([profile.avatar_storage_path]);
      const { error } = await supabase
        .from("profiles")
        .update({ avatar_storage_path: null })
        .eq("id", session.user.id);
      if (error) Alert.alert("Profile", error.message);
      else await refreshProfile();
    } finally {
      setUploadingAvatar(false);
    }
  }

  async function save() {
    if (!session) return;
    setSaving(true);
    try {
      const { error } = await supabase
        .from("profiles")
        .update({
          display_name: name.trim() || null,
          account_type: accountType,
          contact_email: contactEmail.trim() || null,
          location_text: locationText.trim() || null,
          address_line1: address1.trim() || null,
          address_line2: address2.trim() || null,
          city: city.trim() || null,
          postal_code: postalCode.trim() || null,
        })
        .eq("id", session.user.id);
      if (error) Alert.alert("Profile", error.message);
      else {
        await refreshProfile();
        Alert.alert("Saved", "Your profile was updated.");
      }
    } finally {
      setSaving(false);
    }
  }

  if (!session) return null;

  return (
    <View>
      <TextCaption style={{ color: colors.textMuted, lineHeight: 20 }}>
        Update how you appear to buyers and sellers. Changes sync to your account.
      </TextCaption>

      <TextLabel style={{ marginTop: space.xl }}>PROFILE PHOTO</TextLabel>
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          marginTop: space.sm,
          gap: space.md,
        }}
      >
        <Pressable
          onPress={pickAvatar}
          disabled={uploadingAvatar}
          style={{
            width: 96,
            height: 96,
            borderRadius: 48,
            overflow: "hidden",
            borderWidth: 1,
            borderColor: colors.border,
            backgroundColor: colors.surfaceMuted,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          {uploadingAvatar ? (
            <ActivityIndicator />
          ) : avatarUri ? (
            <Image
              key={profile?.avatar_storage_path ?? "none"}
              source={{ uri: avatarUri }}
              style={{ width: 96, height: 96 }}
              onError={(e) =>
                console.warn("avatar image failed to load", avatarUri, e.nativeEvent.error)
              }
            />
          ) : (
            <TextBody style={{ fontSize: 12, textAlign: "center", padding: space.sm }}>
              Add photo
            </TextBody>
          )}
        </Pressable>
        <View style={{ flex: 1 }}>
          <ButtonSecondary title="Choose photo" onPress={pickAvatar} disabled={uploadingAvatar} />
          {profile?.avatar_storage_path ? (
            <ButtonSecondary
              title="Remove photo"
              onPress={removeAvatar}
              disabled={uploadingAvatar}
              style={{ marginTop: space.sm }}
            />
          ) : null}
        </View>
      </View>

      <TextLabel style={{ marginTop: space.xl }}>ACCOUNT TYPE</TextLabel>
      <View style={{ flexDirection: "row", marginTop: space.sm, gap: space.sm }}>
        {(["individual", "business"] as const).map((t) => {
          const selected = accountType === t;
          return (
            <Pressable
              key={t}
              onPress={() => setAccountType(t)}
              style={{
                flex: 1,
                paddingVertical: space.md,
                borderRadius: radii.md,
                borderWidth: 1,
                borderColor: selected ? colors.primary : colors.border,
                backgroundColor: selected ? colors.accentMuted : colors.surfaceMuted,
              }}
            >
              <TextBody style={{ textAlign: "center", fontWeight: selected ? "600" : "500" }}>
                {t === "individual" ? "Individual" : "Business"}
              </TextBody>
            </Pressable>
          );
        })}
      </View>
      <TextCaption style={{ marginTop: space.sm, lineHeight: 18 }}>
        {accountType === "business"
          ? "Use business if you sell as a company and want clearer contact details for buyers."
          : "Individual is fine for most sellers."}
      </TextCaption>

      <View style={{ marginTop: space.lg }}>
        <TextField label="DISPLAY NAME" value={name} onChangeText={setName} />
        <TextField
          label="CONTACT EMAIL (OPTIONAL)"
          value={contactEmail}
          onChangeText={setContactEmail}
          keyboardType="email-address"
          autoCapitalize="none"
          autoCorrect={false}
        />
        <TextField
          label="LOCATION / AREA (OPTIONAL)"
          value={locationText}
          onChangeText={setLocationText}
          placeholder="Island, atoll, or region"
        />
      </View>

      <TextLabel style={{ marginTop: space.md }}>ADDRESS (OPTIONAL)</TextLabel>
      <View style={{ marginTop: space.sm }}>
        <TextField label="LINE 1" value={address1} onChangeText={setAddress1} placeholder="Street, building" />
        <TextField label="LINE 2" value={address2} onChangeText={setAddress2} placeholder="Unit, floor" />
        <TextField label="CITY" value={city} onChangeText={setCity} />
        <TextField label="POSTAL CODE" value={postalCode} onChangeText={setPostalCode} />
      </View>

      <ButtonPrimary
        title={saving ? "Saving…" : "Save changes"}
        onPress={save}
        disabled={saving}
        style={{ marginTop: space.xl }}
      />
    </View>
  );
}
