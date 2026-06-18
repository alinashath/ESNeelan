import { Chip } from "@/src/components/ui/Chip";
import { TextField } from "@/src/components/ui/TextField";
import { TextLabel } from "@/src/components/ui/TextLabel";
import { TextCaption } from "@/src/components/ui/TextCaption";
import {
  APPAREL_SIZE_TAGS,
  COLOR_PRESET_TAGS,
  MATERIAL_PRESET_TAGS,
  type ListingAttributesV1,
  type ListingFieldTemplate,
} from "@/src/lib/listing-attribute-templates";
import { colors, radii, space } from "@/src/theme/tokens";
import { useMemo, useState } from "react";
import { Pressable, TextInput, View } from "react-native";

type Props = {
  template: ListingFieldTemplate;
  value: ListingAttributesV1;
  onChange: (next: ListingAttributesV1) => void;
};

function toggleInList(list: string[] | undefined, tag: string, lower = true): string[] {
  const t = lower ? tag.trim().toLowerCase() : tag.trim();
  if (!t) return list ?? [];
  const cur = [...(list ?? [])];
  const i = cur.findIndex((x) => x.toLowerCase() === t.toLowerCase());
  if (i >= 0) cur.splice(i, 1);
  else cur.push(lower ? t.toLowerCase() : t);
  return cur;
}

function DimField({
  label,
  val,
  onChangeText,
}: {
  label: string;
  val: string;
  onChangeText: (t: string) => void;
}) {
  return (
    <TextField
      label={label}
      value={val}
      onChangeText={onChangeText}
      keyboardType="decimal-pad"
      placeholder="cm"
    />
  );
}

export function ListingStructuredFields({ template, value, onChange }: Props) {
  const [customColor, setCustomColor] = useState("");
  const [customMaterial, setCustomMaterial] = useState("");

  const wStr = useMemo(() => (value.widthCm != null ? String(value.widthCm) : ""), [value.widthCm]);
  const hStr = useMemo(() => (value.heightCm != null ? String(value.heightCm) : ""), [value.heightCm]);
  const dStr = useMemo(() => (value.depthCm != null ? String(value.depthCm) : ""), [value.depthCm]);
  const wtStr = useMemo(() => (value.weightKg != null ? String(value.weightKg) : ""), [value.weightKg]);

  function patch(p: Partial<ListingAttributesV1>) {
    onChange({ ...value, ...p });
  }

  function parseOptionalFloat(s: string): number | null {
    const t = s.trim();
    if (!t) return null;
    const n = Number(t.replace(",", "."));
    return Number.isFinite(n) ? n : null;
  }

  const colorTags = value.colorTags ?? [];
  const materialTags = value.materialTags ?? [];

  return (
    <View style={{ marginBottom: space.md }}>
      <TextLabel style={{ marginBottom: space.sm }}>Item details (structured)</TextLabel>

      {template.showDimensions ? (
        <View style={{ marginBottom: space.sm }}>
          <TextCaption style={{ marginBottom: space.xs, color: colors.textMuted }}>
            {template.dimensionsDepth ? "Width × height × depth" : "Width × height (e.g. artwork)"}
          </TextCaption>
          <DimField
            label="Width (cm)"
            val={wStr}
            onChangeText={(t) => patch({ widthCm: parseOptionalFloat(t) })}
          />
          <DimField
            label="Height (cm)"
            val={hStr}
            onChangeText={(t) => patch({ heightCm: parseOptionalFloat(t) })}
          />
          {template.dimensionsDepth ? (
            <DimField
              label="Depth (cm)"
              val={dStr}
              onChangeText={(t) => patch({ depthCm: parseOptionalFloat(t) })}
            />
          ) : null}
        </View>
      ) : null}

      {template.showApparelSize ? (
        <View style={{ marginBottom: space.lg }}>
          <TextLabel style={{ marginBottom: space.sm }}>Size</TextLabel>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: space.sm }}>
            {APPAREL_SIZE_TAGS.map((sz) => (
              <Chip
                key={sz}
                title={sz}
                appearance="outlined"
                compact
                selected={value.sizeLabel === sz}
                onPress={() =>
                  patch({ sizeLabel: value.sizeLabel === sz ? null : sz })
                }
              />
            ))}
          </View>
        </View>
      ) : null}

      {template.showWeight ? (
        <TextField
          label="Weight (kg, optional)"
          value={wtStr}
          onChangeText={(t) => patch({ weightKg: parseOptionalFloat(t) })}
          keyboardType="decimal-pad"
          placeholder="0"
        />
      ) : null}

      {template.showColorTags ? (
        <View style={{ marginBottom: space.lg }}>
          <TextLabel style={{ marginBottom: space.sm }}>Colours</TextLabel>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: space.sm }}>
            {COLOR_PRESET_TAGS.map((c) => (
              <Chip
                key={c}
                title={c.charAt(0).toUpperCase() + c.slice(1)}
                appearance="outlined"
                compact
                selected={colorTags.includes(c)}
                onPress={() => patch({ colorTags: toggleInList(colorTags, c) })}
              />
            ))}
          </View>
          <View style={{ flexDirection: "row", gap: space.sm, marginTop: space.sm }}>
            <TextInput
              value={customColor}
              onChangeText={setCustomColor}
              placeholder="Add a colour tag"
              placeholderTextColor={colors.textMuted}
              style={{
                flex: 1,
                borderWidth: 1,
                borderColor: colors.border,
                borderRadius: radii.md,
                paddingHorizontal: space.md,
                paddingVertical: space.sm,
                fontSize: 15,
                color: colors.text,
                backgroundColor: colors.surfaceMuted,
              }}
            />
            <Pressable
              onPress={() => {
                const t = customColor.trim();
                if (!t) return;
                patch({ colorTags: toggleInList(colorTags, t) });
                setCustomColor("");
              }}
              style={{
                justifyContent: "center",
                paddingHorizontal: space.md,
                borderRadius: radii.md,
                borderWidth: 1,
                borderColor: colors.border,
                backgroundColor: colors.accentMuted,
              }}
            >
              <TextCaption style={{ fontWeight: "600", color: colors.primary }}>Add</TextCaption>
            </Pressable>
          </View>
        </View>
      ) : null}

      {template.showMaterialTags ? (
        <View style={{ marginBottom: space.lg }}>
          <TextLabel style={{ marginBottom: space.sm }}>Materials & medium</TextLabel>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: space.sm }}>
            {MATERIAL_PRESET_TAGS.map((m) => (
              <Chip
                key={m}
                title={m}
                appearance="outlined"
                compact
                selected={materialTags.includes(m.toLowerCase())}
                onPress={() =>
                  patch({
                    materialTags: toggleInList(materialTags, m),
                  })
                }
              />
            ))}
          </View>
          <View style={{ flexDirection: "row", gap: space.sm, marginTop: space.sm }}>
            <TextInput
              value={customMaterial}
              onChangeText={setCustomMaterial}
              placeholder="Add a material tag"
              placeholderTextColor={colors.textMuted}
              style={{
                flex: 1,
                borderWidth: 1,
                borderColor: colors.border,
                borderRadius: radii.md,
                paddingHorizontal: space.md,
                paddingVertical: space.sm,
                fontSize: 15,
                color: colors.text,
                backgroundColor: colors.surfaceMuted,
              }}
            />
            <Pressable
              onPress={() => {
                const t = customMaterial.trim();
                if (!t) return;
                patch({ materialTags: toggleInList(materialTags, t) });
                setCustomMaterial("");
              }}
              style={{
                justifyContent: "center",
                paddingHorizontal: space.md,
                borderRadius: radii.md,
                borderWidth: 1,
                borderColor: colors.border,
                backgroundColor: colors.accentMuted,
              }}
            >
              <TextCaption style={{ fontWeight: "600", color: colors.primary }}>Add</TextCaption>
            </Pressable>
          </View>
        </View>
      ) : null}
    </View>
  );
}
