import { useState } from "react";
import { Alert, Image, TextInput, View } from "react-native";
import * as ImagePicker from "expo-image-picker";
import type { FeaturedArticleBlock, FeaturedArticlePhotoPlacement } from "@/src/lib/featured-article-blocks";
import {
  featuredArticleImagePublicUrl,
  removeFeaturedArticleImage,
  uploadFeaturedArticleImage,
} from "@/src/lib/featured-article-images";
import { TextLabel } from "@/src/components/ui/TextLabel";
import { TextCaption } from "@/src/components/ui/TextCaption";
import { ButtonSecondary } from "@/src/components/ui/ButtonSecondary";
import { Chip } from "@/src/components/ui/Chip";
import { ChipRow } from "@/src/components/ui/ChipRow";
import { colors, radii, space } from "@/src/theme/tokens";

type PhotoBlock = Extract<FeaturedArticleBlock, { type: "photo" }>;

const PLACEMENTS: { id: FeaturedArticlePhotoPlacement; label: string }[] = [
  { id: "contained", label: "Contained" },
  { id: "wide", label: "Wide" },
  { id: "bleed", label: "Edge to edge" },
];

function inputStyle() {
  return {
    marginTop: space.sm,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.md,
    paddingHorizontal: space.md,
    paddingVertical: space.sm,
    color: colors.text,
  } as const;
}

type Props = {
  block: PhotoBlock;
  onChange: (b: PhotoBlock) => void;
  articleId: string;
};

export function FeaturedArticlePhotoEditor({ block, onChange, articleId }: Props) {
  const [busy, setBusy] = useState(false);
  const uri = block.storage_path.trim()
    ? featuredArticleImagePublicUrl(block.storage_path.trim())
    : null;

  async function pickAndUpload() {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert("Photos", "Allow photo library access to upload.");
      return;
    }
    const res = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.82,
    });
    if (res.canceled || !res.assets?.[0]) return;
    const asset = res.assets[0];
    const mime = asset.mimeType ?? "image/jpeg";
    setBusy(true);
    try {
      const prevPath = block.storage_path.trim();
      const up = await uploadFeaturedArticleImage(articleId, asset.uri, mime);
      if ("error" in up) {
        Alert.alert("Upload failed", up.error);
        return;
      }
      if (prevPath && prevPath !== up.path) {
        await removeFeaturedArticleImage(prevPath);
      }
      onChange({
        ...block,
        storage_path: up.path,
      });
    } finally {
      setBusy(false);
    }
  }

  async function clearPhoto() {
    const prevPath = block.storage_path.trim();
    if (!prevPath) {
      onChange({ ...block, storage_path: "" });
      return;
    }
    Alert.alert("Remove image", "Delete this photo from storage?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Remove",
        style: "destructive",
        onPress: async () => {
          setBusy(true);
          try {
            await removeFeaturedArticleImage(prevPath);
            onChange({ ...block, storage_path: "", alt: "" });
          } finally {
            setBusy(false);
          }
        },
      },
    ]);
  }

  return (
    <View>
      <TextLabel>IMAGE</TextLabel>
      {uri ? (
        <View style={{ marginTop: space.sm }}>
          <Image
            source={{ uri }}
            style={{
              width: "100%",
              height: 180,
              borderRadius: radii.md,
              backgroundColor: colors.surfaceMuted,
            }}
            resizeMode="cover"
          />
        </View>
      ) : (
        <TextCaption style={{ marginTop: space.sm, color: colors.textMuted }}>
          No image yet — upload from your library.
        </TextCaption>
      )}

      <View style={{ marginTop: space.md, flexDirection: "row", flexWrap: "wrap", gap: space.sm }}>
        <ButtonSecondary
          title={busy ? "Working…" : uri ? "Replace photo" : "Upload photo"}
          onPress={() => void pickAndUpload()}
          disabled={busy}
        />
        {uri ? (
          <ButtonSecondary title="Remove" onPress={() => void clearPhoto()} disabled={busy} />
        ) : null}
      </View>

      <TextLabel style={{ marginTop: space.lg }}>ALT TEXT (ACCESSIBILITY)</TextLabel>
      <TextInput
        value={block.alt ?? ""}
        onChangeText={(alt) => onChange({ ...block, alt })}
        placeholder="Describe the image"
        placeholderTextColor={colors.textMuted}
        style={inputStyle()}
      />

      <TextLabel style={{ marginTop: space.lg }}>PLACEMENT</TextLabel>
      <TextCaption style={{ marginTop: space.xs, marginBottom: space.sm, color: colors.textSecondary }}>
        Contained stays in the article column. Wide uses a larger max width. Edge to edge spans the
        screen width in the reader.
      </TextCaption>
      <ChipRow>
        {PLACEMENTS.map((p) => (
          <Chip
            key={p.id}
            title={p.label}
            appearance="outlined"
            selected={block.placement === p.id}
            onPress={() => onChange({ ...block, placement: p.id })}
          />
        ))}
      </ChipRow>
    </View>
  );
}
