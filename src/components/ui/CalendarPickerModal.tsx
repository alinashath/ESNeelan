import { useEffect, useMemo, useState } from "react";
import { Modal, Pressable, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { colors, radii, space } from "@/src/theme/tokens";
import { TextBody } from "./TextBody";
import { TextTitle } from "./TextTitle";
import { ButtonPrimary } from "./ButtonPrimary";
import { ButtonSecondary } from "./ButtonSecondary";

const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

function monthMatrix(year: number, monthIndex: number): (number | null)[][] {
  const first = new Date(year, monthIndex, 1);
  const startWeekday = (first.getDay() + 6) % 7;
  const dim = new Date(year, monthIndex + 1, 0).getDate();
  const cells: (number | null)[] = [];
  for (let i = 0; i < startWeekday; i++) cells.push(null);
  for (let d = 1; d <= dim; d++) cells.push(d);
  while (cells.length % 7 !== 0) cells.push(null);
  const rows: (number | null)[][] = [];
  for (let i = 0; i < cells.length; i += 7) rows.push(cells.slice(i, i + 7));
  return rows;
}

type Props = {
  visible: boolean;
  title: string;
  value: Date;
  minimumDate?: Date;
  maximumDate?: Date;
  onDismiss: () => void;
  onConfirm: (d: Date) => void;
};

export function CalendarPickerModal({
  visible,
  title,
  value,
  minimumDate,
  maximumDate,
  onDismiss,
  onConfirm,
}: Props) {
  const [cursor, setCursor] = useState(() => ({
    y: value.getFullYear(),
    m: value.getMonth(),
  }));
  const [pickedDay, setPickedDay] = useState(value.getDate());

  useEffect(() => {
    if (visible) {
      setCursor({ y: value.getFullYear(), m: value.getMonth() });
      setPickedDay(value.getDate());
    }
  }, [visible, value]);

  const matrix = useMemo(
    () => monthMatrix(cursor.y, cursor.m),
    [cursor.y, cursor.m],
  );

  const monthLabel = useMemo(
    () =>
      new Date(cursor.y, cursor.m, 1).toLocaleString(undefined, {
        month: "long",
        year: "numeric",
      }),
    [cursor.y, cursor.m],
  );

  function shiftMonth(delta: number) {
    const d = new Date(cursor.y, cursor.m + delta, 1);
    setCursor({ y: d.getFullYear(), m: d.getMonth() });
  }

  function isDisabledDay(day: number): boolean {
    const candidate = new Date(cursor.y, cursor.m, day, 12, 0, 0, 0);
    if (minimumDate && candidate < stripTime(minimumDate)) return true;
    if (maximumDate && candidate > stripTime(maximumDate)) return true;
    return false;
  }

  function confirmSelection() {
    const dim = new Date(cursor.y, cursor.m + 1, 0).getDate();
    const day = Math.min(Math.max(1, pickedDay), dim);
    const next = new Date(value);
    next.setFullYear(cursor.y, cursor.m, day);
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
          <TextTitle style={{ marginBottom: space.md }}>{title}</TextTitle>
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
              marginBottom: space.md,
            }}
          >
            <Pressable onPress={() => shiftMonth(-1)} hitSlop={12}>
              <Ionicons name="chevron-back" size={26} color={colors.text} />
            </Pressable>
            <TextBody style={{ fontWeight: "600", fontSize: 17 }}>{monthLabel}</TextBody>
            <Pressable onPress={() => shiftMonth(1)} hitSlop={12}>
              <Ionicons name="chevron-forward" size={26} color={colors.text} />
            </Pressable>
          </View>
          <View style={{ flexDirection: "row", marginBottom: space.sm }}>
            {WEEKDAYS.map((w) => (
              <View key={w} style={{ flex: 1, alignItems: "center" }}>
                <TextBody style={{ fontSize: 12, color: colors.textMuted, fontWeight: "600" }}>
                  {w}
                </TextBody>
              </View>
            ))}
          </View>
          {matrix.map((row, ri) => (
            <View key={ri} style={{ flexDirection: "row", marginBottom: 4 }}>
              {row.map((cell, ci) => {
                if (cell == null) {
                  return <View key={ci} style={{ flex: 1, aspectRatio: 1 }} />;
                }
                const selected = cell === pickedDay;
                const disabled = isDisabledDay(cell);
                return (
                  <Pressable
                    key={ci}
                    disabled={disabled}
                    onPress={() => setPickedDay(cell)}
                    style={{
                      flex: 1,
                      margin: 2,
                      aspectRatio: 1,
                      maxHeight: 44,
                      borderRadius: radii.md,
                      alignItems: "center",
                      justifyContent: "center",
                      backgroundColor: selected ? colors.text : "transparent",
                      opacity: disabled ? 0.25 : 1,
                    }}
                  >
                    <TextBody
                      style={{
                        fontWeight: selected ? "600" : "500",
                        color: selected ? colors.background : colors.text,
                      }}
                    >
                      {cell}
                    </TextBody>
                  </Pressable>
                );
              })}
            </View>
          ))}
          <View style={{ flexDirection: "row", marginTop: space.lg, gap: space.sm }}>
            <View style={{ flex: 1 }}>
              <ButtonSecondary title="Cancel" onPress={onDismiss} />
            </View>
            <View style={{ flex: 1 }}>
              <ButtonPrimary title="Apply" onPress={confirmSelection} />
            </View>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

function stripTime(d: Date): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}
