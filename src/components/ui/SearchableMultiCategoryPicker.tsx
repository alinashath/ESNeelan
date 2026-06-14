import { useMemo, useState } from "react";
import {
  FlatList,
  Modal,
  Pressable,
  TextInput,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import type { CategoryRow } from "@/src/data/category-utils";
import { categoryPathLabel, filterCategoriesBySearch } from "@/src/data/category-utils";
import { colors, radii, space } from "@/src/theme/tokens";
import { TextBody } from "./TextBody";
import { TextLabel } from "./TextLabel";
import { TextTitle } from "./TextTitle";
import { ButtonPrimary } from "./ButtonPrimary";
import { ButtonSecondary } from "./ButtonSecondary";

const MAX = 5;

type Props = {
  label: string;
  categories: CategoryRow[];
  selectedIds: string[];
  onChange: (ids: string[]) => void;
};

export function SearchableMultiCategoryPicker({
  label,
  categories,
  selectedIds,
  onChange,
}: Props) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");

  const filtered = useMemo(() => filterCategoriesBySearch(categories, q), [categories, q]);

  const summary = useMemo(() => {
    if (!selectedIds.length) return "Tap to choose categories";
    return selectedIds
      .map((id) => categoryPathLabel(categories, id))
      .join(" · ");
  }, [selectedIds, categories]);

  function toggle(id: string) {
    if (selectedIds.includes(id)) {
      onChange(selectedIds.filter((x) => x !== id));
      return;
    }
    if (selectedIds.length >= MAX) return;
    onChange([...selectedIds, id]);
  }

  return (
    <View style={{ marginBottom: space.lg }}>
      <TextLabel style={{ marginBottom: space.sm }}>{label}</TextLabel>
      <Pressable
        onPress={() => {
          setQ("");
          setOpen(true);
        }}
        style={{
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          borderWidth: 1,
          borderColor: colors.border,
          borderRadius: radii.md,
          paddingHorizontal: space.lg,
          paddingVertical: space.md,
          backgroundColor: colors.surfaceMuted,
        }}
      >
        <TextBody style={{ flex: 1, paddingRight: space.md }} numberOfLines={3}>
          {summary}
        </TextBody>
        <Ionicons name="search" size={20} color={colors.textMuted} />
      </Pressable>
      <TextBody style={{ marginTop: space.xs, fontSize: 12, color: colors.textMuted }}>
        Up to {MAX} categories · search by name or path
      </TextBody>

      <Modal visible={open} transparent animationType="slide" onRequestClose={() => setOpen(false)}>
        <View style={{ flex: 1, backgroundColor: colors.background, paddingTop: space.xl }}>
          <View style={{ paddingHorizontal: space.lg, marginBottom: space.md }}>
            <TextTitle style={{ marginBottom: space.md }}>Categories</TextTitle>
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                borderWidth: 1,
                borderColor: colors.border,
                borderRadius: radii.md,
                paddingHorizontal: space.md,
                backgroundColor: colors.surfaceMuted,
              }}
            >
              <Ionicons name="search" size={18} color={colors.textMuted} />
              <TextInput
                placeholder="Search…"
                placeholderTextColor={colors.textMuted}
                value={q}
                onChangeText={setQ}
                style={{
                  flex: 1,
                  paddingVertical: space.md,
                  paddingHorizontal: space.sm,
                  fontSize: 16,
                  color: colors.text,
                }}
              />
            </View>
          </View>
          <FlatList
            showsVerticalScrollIndicator={false}
            showsHorizontalScrollIndicator={false}
            data={filtered}
            keyExtractor={(item) => item.id}
            contentContainerStyle={{ paddingHorizontal: space.lg, paddingBottom: space.xxl }}
            keyboardShouldPersistTaps="handled"
            renderItem={({ item }) => {
              const path = categoryPathLabel(categories, item.id);
              const on = selectedIds.includes(item.id);
              const atCap = selectedIds.length >= MAX && !on;
              return (
                <Pressable
                  onPress={() => !atCap && toggle(item.id)}
                  style={{
                    paddingVertical: space.md,
                    borderBottomWidth: 1,
                    borderBottomColor: colors.border,
                    opacity: atCap ? 0.45 : 1,
                  }}
                >
                  <View style={{ flexDirection: "row", alignItems: "center" }}>
                    <Ionicons
                      name={on ? "checkbox" : "square-outline"}
                      size={22}
                      color={on ? colors.text : colors.textMuted}
                      style={{ marginRight: space.md }}
                    />
                    <View style={{ flex: 1 }}>
                      <TextBody style={{ fontWeight: "600" }}>{item.name}</TextBody>
                      {path !== item.name ? (
                        <TextBody style={{ fontSize: 12, color: colors.textMuted, marginTop: 2 }}>
                          {path}
                        </TextBody>
                      ) : null}
                    </View>
                  </View>
                </Pressable>
              );
            }}
          />
          <View
            style={{
              padding: space.lg,
              borderTopWidth: 1,
              borderTopColor: colors.border,
              flexDirection: "row",
              gap: space.sm,
            }}
          >
            <View style={{ flex: 1 }}>
              <ButtonSecondary title="Clear" onPress={() => onChange([])} />
            </View>
            <View style={{ flex: 2 }}>
              <ButtonPrimary title="Done" onPress={() => setOpen(false)} />
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}
