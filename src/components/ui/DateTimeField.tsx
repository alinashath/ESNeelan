import DateTimePicker, {
  type DateTimePickerEvent,
} from "@react-native-community/datetimepicker";
import { useState } from "react";
import { Platform, Pressable, View } from "react-native";
import { colors, radii, space } from "@/src/theme/tokens";
import { TextBody } from "./TextBody";
import { TextLabel } from "./TextLabel";

type Props = {
  label: string;
  value: Date;
  onChange: (d: Date) => void;
  mode?: "date" | "time";
};

export function DateTimeField({
  label,
  value,
  onChange,
  mode = "date",
}: Props) {
  const [show, setShow] = useState(false);
  const onPick = (_e: DateTimePickerEvent, d?: Date) => {
    setShow(Platform.OS === "ios");
    if (d) onChange(d);
  };
  return (
    <View style={{ marginBottom: space.lg }}>
      <TextLabel style={{ marginBottom: space.sm }}>{label}</TextLabel>
      <Pressable
        onPress={() => setShow(true)}
        style={{
          borderWidth: 1,
          borderColor: colors.border,
          borderRadius: radii.md,
          paddingHorizontal: space.lg,
          paddingVertical: space.md,
          backgroundColor: colors.surfaceMuted,
        }}
      >
        <TextBody>
          {mode === "date"
            ? value.toLocaleDateString()
            : value.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
        </TextBody>
      </Pressable>
      {show ? (
        <DateTimePicker
          value={value}
          mode={mode}
          display={Platform.OS === "ios" ? "spinner" : "default"}
          onChange={onPick}
        />
      ) : null}
    </View>
  );
}
