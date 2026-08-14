import { formatMoneyAmount } from "@/src/lib/format-money";
import { colors, fontFamilies } from "@/src/theme/tokens";
import { Text, View, type TextStyle } from "react-native";
import { RufiyaaSign } from "./RufiyaaSign";

type Props = {
  amount: number;
  /**
   * @deprecated Ignored — UI always uses the official Rufiyaa SVG on the left.
   * Kept for call-site compatibility.
   */
  currency?: string;
  /** Hero current bid on auction detail. `sm` for list/grid auction cards. */
  size?: "default" | "hero" | "compact" | "sm";
  /** Emphasize amount in danger tone (e.g. outbid). */
  amountTone?: "default" | "danger";
  /** Override currency sign color (defaults to amount color). */
  currencyColor?: string;
  /** Override amount color (e.g. white on dark scrims). `amountTone="danger"` still wins. */
  amountColor?: string;
  /** Override amount font weight (e.g. semibold on featured hero). */
  amountFontWeight?: TextStyle["fontWeight"];
  /**
   * @deprecated Sign is always inline at the amount’s size/baseline, left of the figure.
   * Kept for call-site compatibility.
   */
  layout?: "stack" | "inline";
};

const SIZES = {
  hero: { amount: 26, amountLH: 30, sign: 22 },
  compact: { amount: 19, amountLH: 24, sign: 16 },
  sm: { amount: 15, amountLH: 20, sign: 13 },
  default: { amount: 20, amountLH: 26, sign: 17 },
} as const;

/**
 * Price display: official Rufiyaa SVG + amount on one line (MMA: symbol left of figure).
 */
export function ValueCurrency({
  amount,
  size = "default",
  amountTone = "default",
  currencyColor,
  amountColor: amountColorProp,
  amountFontWeight = "400",
}: Props) {
  const formatted = formatMoneyAmount(amount);
  const s = SIZES[size];

  const amountColor =
    amountTone === "danger"
      ? colors.danger
      : (amountColorProp ?? colors.primary);
  const curColor = currencyColor ?? amountColor;

  const amountStyle = {
    fontFamily: fontFamilies.body,
    fontWeight: amountFontWeight,
    fontSize: s.amount,
    lineHeight: s.amountLH,
    letterSpacing: size === "hero" ? -0.35 : -0.2,
    color: amountColor,
  };

  return (
    <View
      style={{
        maxWidth: "100%",
        alignSelf: "flex-start",
        flexShrink: size === "hero" ? 1 : undefined,
        minWidth: size === "hero" ? 0 : undefined,
        flexDirection: "row",
        alignItems: "center",
        flexWrap: "nowrap",
        columnGap: 6,
        rowGap: 2,
      }}
    >
      <RufiyaaSign size={s.sign} color={curColor} />
      <Text
        numberOfLines={1}
        adjustsFontSizeToFit
        minimumFontScale={size === "hero" ? 0.55 : 0.8}
        style={amountStyle}
      >
        {formatted}
      </Text>
    </View>
  );
}
