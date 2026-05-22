import { useState } from "react";
import { Modal, Pressable, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { colors, radii, space } from "@/src/theme/tokens";
import { TextBody } from "./TextBody";
import { TextLabel } from "./TextLabel";
import { TextTitle } from "./TextTitle";

export type SelectOption<T extends string> = { value: T; label: string };

type Props<T extends string> = {
  label: string;
  value: T;
  options: SelectOption<T>[];
  onSelect: (v: T) => void;
  title?: string;
};

export function SelectField<T extends string>({
  label,
  value,
  options,
  onSelect,
  title = "Select",
}: Props<T>) {
  const [open, setOpen] = useState(false);
  const current = options.find((o) => o.value === value)?.label ?? value;
  return (
    <View style={{ marginBottom: space.lg }}>
      <TextLabel style={{ marginBottom: space.sm }}>{label}</TextLabel>
      <Pressable
        onPress={() => setOpen(true)}
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
        <TextBody>{current}</TextBody>
        <Ionicons name="chevron-down" size={18} color={colors.textMuted} />
      </Pressable>
      <Modal transparent visible={open} animationType="fade">
        <Pressable
          onPress={() => setOpen(false)}
          style={{
            flex: 1,
            backgroundColor: "rgba(0,0,0,0.4)",
            justifyContent: "center",
            padding: space.xl,
          }}
        >
          <Pressable
            onPress={(e) => e.stopPropagation()}
            style={{
              backgroundColor: colors.background,
              borderRadius: radii.lg,
              padding: space.lg,
            }}
          >
            <TextTitle style={{ marginBottom: space.lg }}>{title}</TextTitle>
            {options.map((o) => (
              <Pressable
                key={o.value}
                onPress={() => {
                  onSelect(o.value);
                  setOpen(false);
                }}
                style={{
                  paddingVertical: space.md,
                  borderBottomWidth: 1,
                  borderBottomColor: colors.border,
                }}
              >
                <TextBody
                  style={{
                    fontWeight: o.value === value ? "700" : "400",
                  }}
                >
                  {o.label}
                </TextBody>
              </Pressable>
            ))}
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}
