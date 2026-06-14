import { useEffect, useState } from "react";
import { Text, View, type ViewStyle } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { formatAuctionBadgeCountdown } from "@/src/lib/auction-countdown-format";
import { colors, fontFamilies } from "@/src/theme/tokens";

const BADGE_RADIUS = 6;
const BADGE_PAD_V = 4;
const BADGE_PAD_H = 8;
const DEFAULT_INSET = 10;

type Props = {
  endsAt: string;
  /** When false, shows nothing (caller hides for non-active). */
  active?: boolean;
  style?: ViewStyle;
  /** Distance from top/right of parent (absolute positioning). */
  inset?: number;
  /** Cap width on narrow heroes (e.g. carousel). */
  maxWidth?: number | `${number}%`;
  /** &lt; 1h remaining — alert styling. */
  urgent?: boolean;
};

function secondsLeft(endsAt: string) {
  return Math.max(0, Math.floor((new Date(endsAt).getTime() - Date.now()) / 1000));
}

/**
 * Countdown pill on lot imagery — ES Neelan dark luxury (subtle panel + ivory / red numerals).
 */
export function AuctionCountdownBadge({
  endsAt,
  active = true,
  style,
  inset = DEFAULT_INSET,
  maxWidth = "92%",
  urgent = false,
}: Props) {
  const [sec, setSec] = useState(() => secondsLeft(endsAt));

  useEffect(() => {
    if (!active) return;
    setSec(secondsLeft(endsAt));
    const t = setInterval(() => setSec(secondsLeft(endsAt)), 1000);
    return () => clearInterval(t);
  }, [endsAt, active]);

  if (!active) return null;

  const label = formatAuctionBadgeCountdown(sec);
  const panelBg = "rgba(255,255,255,0.06)";
  const numColor = urgent ? colors.danger : colors.text;

  return (
    <View
      pointerEvents="none"
      style={[
        {
          position: "absolute",
          top: inset,
          right: inset,
          maxWidth,
          flexDirection: "row",
          alignItems: "center",
          gap: 6,
          backgroundColor: panelBg,
          borderWidth: 1,
          borderColor: colors.border,
          paddingVertical: BADGE_PAD_V,
          paddingHorizontal: BADGE_PAD_H,
          borderRadius: BADGE_RADIUS,
        },
        style,
      ]}
    >
      <Ionicons name="stopwatch-outline" size={14} color={colors.textMuted} />
      <Text
        style={{
          color: numColor,
          fontWeight: "600",
          fontSize: 12,
          fontFamily: fontFamilies.bodySemiBold,
          letterSpacing: 0.3,
        }}
        numberOfLines={1}
        adjustsFontSizeToFit
        minimumFontScale={0.85}
      >
        {label}
      </Text>
    </View>
  );
}
