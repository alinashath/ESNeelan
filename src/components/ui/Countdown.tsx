import { useEffect, useState } from "react";
import { View } from "react-native";
import { colors, space } from "@/src/theme/tokens";
import { TextBody } from "./TextBody";

type Props = { endsAt: string; urgentBelowSeconds?: number };

function pad(n: number) {
  return n.toString().padStart(2, "0");
}

export function Countdown({ endsAt, urgentBelowSeconds = 3600 }: Props) {
  const [left, setLeft] = useState(() =>
    Math.max(0, new Date(endsAt).getTime() - Date.now()),
  );

  useEffect(() => {
    const t = setInterval(() => {
      setLeft(Math.max(0, new Date(endsAt).getTime() - Date.now()));
    }, 1000);
    return () => clearInterval(t);
  }, [endsAt]);

  const totalSec = Math.floor(left / 1000);
  const urgent = totalSec <= urgentBelowSeconds && totalSec > 0;
  const d = Math.floor(totalSec / 86400);
  const h = Math.floor((totalSec % 86400) / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  const label =
    d > 0
      ? `${d}d ${pad(h)}:${pad(m)}:${pad(s)}`
      : `${pad(h)}:${pad(m)}:${pad(s)}`;

  return (
    <View style={{ alignSelf: "flex-start" }}>
      <TextBody
        style={{
          fontWeight: "800",
          letterSpacing: 0.5,
          color: urgent ? colors.danger : colors.primary,
        }}
      >
        {totalSec <= 0 ? "ENDED" : `ENDS IN ${label}`}
      </TextBody>
    </View>
  );
}
