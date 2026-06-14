import { View, Text } from "react-native";
import { colors, fontFamilies, radii, space } from "@/src/theme/tokens";

type Stat = { value: string; label: string };

const DEFAULT_STATS: Stat[] = [
  { value: "1.2k+", label: "LIVE ITEMS" },
  { value: "98%", label: "SUCCESS RATE" },
  { value: "24/7", label: "SUPPORT" },
];

type Props = {
  stats?: Stat[];
};

/** Three-column stats — white card, semibold display numbers, muted labels. */
export function HomeStatsBar({ stats = DEFAULT_STATS }: Props) {
  return (
    <View
      style={{
        flexDirection: "row",
        backgroundColor: colors.surfaceMuted,
        borderRadius: radii.md,
        borderWidth: 1,
        borderColor: colors.border,
        paddingVertical: space.xl,
        paddingHorizontal: space.md,
        marginTop: space.xxxl,
      }}
    >
      {stats.map((s, i) => (
        <View
          key={s.label}
          style={{
            flex: 1,
            alignItems: "center",
            justifyContent: "center",
            borderLeftWidth: i === 0 ? 0 : 1,
            borderLeftColor: colors.border,
          }}
        >
          <Text
            style={{
              fontSize: 24,
              fontWeight: "600",
              color: colors.text,
              letterSpacing: -0.3,
              fontFamily: fontFamilies.displaySemiBold,
            }}
          >
            {s.value}
          </Text>
          <Text
            style={{
              marginTop: 6,
              fontSize: 11,
              fontWeight: "600",
              letterSpacing: 1,
              color: colors.textMuted,
              fontFamily: fontFamilies.bodySemiBold,
              textTransform: "uppercase",
            }}
          >
            {s.label}
          </Text>
        </View>
      ))}
    </View>
  );
}
