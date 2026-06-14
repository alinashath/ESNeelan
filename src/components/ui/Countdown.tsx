import { useEffect, useMemo, useState } from "react";
import { View } from "react-native";
import { colors, fontFamilies, radii, space } from "@/src/theme/tokens";
import { formatAuctionBadgeCountdown } from "@/src/lib/auction-countdown-format";
import { TextBody } from "./TextBody";
import { TextCaption } from "./TextCaption";

type Props = {
  endsAt: string;
  /** Auction start — used for time-remaining progress bar. */
  startsAt?: string | null;
  urgentBelowSeconds?: number;
  /** Compact red timer + progress (auction detail). */
  variant?: "inline" | "detail";
};

export function Countdown({
  endsAt,
  startsAt,
  urgentBelowSeconds = 3600,
  variant = "inline",
}: Props) {
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

  const progressRemaining = useMemo(() => {
    const end = new Date(endsAt).getTime();
    const start = startsAt ? new Date(startsAt).getTime() : end - 7 * 86400000;
    const now = Date.now();
    const span = Math.max(1, end - start);
    const rem = Math.max(0, end - now);
    return Math.min(1, rem / span);
  }, [endsAt, startsAt]);

  if (variant === "detail") {
    const urgentDetail = totalSec > 0 && totalSec <= 60;
    const timerColor =
      totalSec <= 0 ? colors.textMuted : urgentDetail ? colors.danger : colors.text;
    return (
      <View style={{ flex: 1, minWidth: 0 }}>
        <TextCaption style={{ fontWeight: "600", letterSpacing: 1.2, color: colors.textMuted }}>
          ENDS IN
        </TextCaption>
        {totalSec <= 0 ? (
          <TextBody
            style={{
              marginTop: space.xs,
              fontWeight: "600",
              fontSize: 20,
              fontFamily: fontFamilies.bodySemiBold,
              color: colors.textMuted,
            }}
          >
            ENDED
          </TextBody>
        ) : (
          <TextBody
            style={{
              marginTop: space.xs,
              fontWeight: "600",
              fontSize: 20,
              fontFamily: fontFamilies.bodySemiBold,
              color: timerColor,
              letterSpacing: 0.4,
            }}
            numberOfLines={1}
            adjustsFontSizeToFit
            minimumFontScale={0.65}
          >
            {formatAuctionBadgeCountdown(totalSec)}
          </TextBody>
        )}
        {totalSec > 0 ? (
          <View
            style={{
              marginTop: space.sm,
              height: 6,
              borderRadius: radii.pill,
              backgroundColor: colors.border,
              overflow: "hidden",
            }}
          >
            <View
              style={{
                height: "100%",
                width: `${Math.round(progressRemaining * 100)}%`,
                backgroundColor: urgentDetail ? colors.danger : colors.accent,
                borderRadius: radii.pill,
              }}
            />
          </View>
        ) : null}
      </View>
    );
  }

  const label = formatAuctionBadgeCountdown(totalSec);

  return (
    <View style={{ alignSelf: "flex-start", flexDirection: "row", alignItems: "baseline", flexWrap: "wrap" }}>
      <TextBody
        style={{
          fontWeight: "600",
          letterSpacing: 0.5,
          color: colors.textMuted,
          fontFamily: fontFamilies.bodySemiBold,
        }}
      >
        {totalSec <= 0 ? "ENDED" : "ENDS IN "}
      </TextBody>
      {totalSec > 0 ? (
        <TextBody
          style={{
            fontWeight: "600",
            letterSpacing: 0.5,
            fontFamily: fontFamilies.bodySemiBold,
            color: urgent ? colors.danger : colors.accent,
          }}
        >
          {label}
        </TextBody>
      ) : null}
    </View>
  );
}
