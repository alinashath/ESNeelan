import { useEffect, useState } from "react";
import { Modal, Pressable, View } from "react-native";
import { colors, radii, space } from "@/src/theme/tokens";
import { TextBody } from "./TextBody";
import { TextTitle } from "./TextTitle";
import { NumericStepper } from "./NumericStepper";
import { ButtonPrimary } from "./ButtonPrimary";
import { ButtonSecondary } from "./ButtonSecondary";

type Props = {
  visible: boolean;
  title: string;
  value: Date;
  onDismiss: () => void;
  onConfirm: (d: Date) => void;
};

export function TimePickerModal({ visible, title, value, onDismiss, onConfirm }: Props) {
  const [hour, setHour] = useState(value.getHours());
  const [minute, setMinute] = useState(value.getMinutes());

  useEffect(() => {
    if (visible) {
      setHour(value.getHours());
      setMinute(value.getMinutes());
    }
  }, [visible, value]);

  function apply() {
    const next = new Date(value);
    next.setHours(hour, minute, 0, 0);
    onConfirm(next);
    onDismiss();
  }

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onDismiss}>
      <Pressable
        onPress={onDismiss}
        style={{
          flex: 1,
          backgroundColor: "rgba(0,0,0,0.45)",
          justifyContent: "center",
          padding: space.lg,
        }}
      >
        <Pressable
          onPress={(e) => e.stopPropagation()}
          style={{
            backgroundColor: colors.background,
            borderRadius: radii.lg,
            padding: space.lg,
            borderWidth: 1,
            borderColor: colors.border,
          }}
        >
          <TextTitle style={{ marginBottom: space.lg }}>{title}</TextTitle>
          <View style={{ flexDirection: "row", gap: space.lg, justifyContent: "center" }}>
            <View style={{ alignItems: "center" }}>
              <TextBody style={{ marginBottom: space.sm, fontWeight: "600" }}>Hour</TextBody>
              <NumericStepper
                value={hour}
                min={0}
                max={23}
                step={1}
                onChange={setHour}
              />
            </View>
            <View style={{ alignItems: "center" }}>
              <TextBody style={{ marginBottom: space.sm, fontWeight: "600" }}>Minute</TextBody>
              <NumericStepper
                value={minute}
                min={0}
                max={59}
                step={1}
                onChange={setMinute}
              />
            </View>
          </View>
          <View style={{ flexDirection: "row", marginTop: space.xl, gap: space.sm }}>
            <View style={{ flex: 1 }}>
              <ButtonSecondary title="Cancel" onPress={onDismiss} />
            </View>
            <View style={{ flex: 1 }}>
              <ButtonPrimary title="Apply" onPress={apply} />
            </View>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}
