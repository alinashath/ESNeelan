import { useState } from "react";
import { Pressable, View } from "react-native";
import { colors, radii, space } from "@/src/theme/tokens";
import { TextBody } from "./TextBody";
import { TextLabel } from "./TextLabel";
import { CalendarPickerModal } from "./CalendarPickerModal";
import { TimePickerModal } from "./TimePickerModal";

type Props = {
  label: string;
  value: Date;
  onChange: (d: Date) => void;
  mode?: "date" | "time" | "datetime";
  minimumDate?: Date;
  maximumDate?: Date;
};

export function DateTimeField({
  label,
  value,
  onChange,
  mode = "datetime",
  minimumDate,
  maximumDate,
}: Props) {
  const [calOpen, setCalOpen] = useState(false);
  const [timeOpen, setTimeOpen] = useState(false);

  const dateStr = value.toLocaleDateString(undefined, {
    weekday: "short",
    year: "numeric",
    month: "short",
    day: "numeric",
  });
  const timeStr = value.toLocaleTimeString(undefined, {
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <View style={{ marginBottom: space.lg }}>
      <TextLabel style={{ marginBottom: space.sm }}>{label}</TextLabel>
      {mode !== "time" ? (
        <Pressable
          onPress={() => setCalOpen(true)}
          style={{
            borderWidth: 1,
            borderColor: colors.border,
            borderRadius: radii.md,
            paddingHorizontal: space.lg,
            paddingVertical: space.md,
            backgroundColor: colors.surfaceMuted,
            marginBottom: mode === "datetime" ? space.sm : 0,
          }}
        >
          <TextBody style={{ fontWeight: "600" }}>{dateStr}</TextBody>
          <TextBody style={{ fontSize: 12, color: colors.textMuted, marginTop: 4 }}>
            Calendar
          </TextBody>
        </Pressable>
      ) : null}
      {mode !== "date" ? (
        <Pressable
          onPress={() => setTimeOpen(true)}
          style={{
            borderWidth: 1,
            borderColor: colors.border,
            borderRadius: radii.md,
            paddingHorizontal: space.lg,
            paddingVertical: space.md,
            backgroundColor: colors.surfaceMuted,
          }}
        >
          <TextBody style={{ fontWeight: "600" }}>{timeStr}</TextBody>
          <TextBody style={{ fontSize: 12, color: colors.textMuted, marginTop: 4 }}>
            Time
          </TextBody>
        </Pressable>
      ) : null}

      <CalendarPickerModal
        visible={calOpen}
        title={`${label} — date`}
        value={value}
        minimumDate={minimumDate}
        maximumDate={maximumDate}
        onDismiss={() => setCalOpen(false)}
        onConfirm={onChange}
      />
      <TimePickerModal
        visible={timeOpen}
        title={`${label} — time`}
        value={value}
        onDismiss={() => setTimeOpen(false)}
        onConfirm={onChange}
      />
    </View>
  );
}
