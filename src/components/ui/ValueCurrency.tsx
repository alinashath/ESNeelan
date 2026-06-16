import { formatMoneyAmount } from "@/src/lib/format-money";
import { colors, fontFamilies } from "@/src/theme/tokens";
import { Text, View, type TextStyle } from "react-native";

type Props = {
  amount: number;
  currency?: string;
  /** Hero current bid on auction detail. */
  size?: "default" | "hero" | "compact";
  /** Emphasize amount in danger tone (e.g. outbid). */
  amountTone?: "default" | "danger";
  /** Override currency label color (e.g. light text on hero photography). */
  currencyColor?: string;
  /** Override amount color (e.g. white on dark scrims). `amountTone="danger"` still wins. */
  amountColor?: string;
  /** Override amount font weight (e.g. semibold on featured hero). */
  amountFontWeight?: TextStyle["fontWeight"];
  /**
   * `inline` — currency + amount on one row, baseline-aligned (e.g. featured cards).
   * Ignored when `size="hero"` (hero page keeps stacked layout).
   */
  layout?: "stack" | "inline";
};

const SIZES = {
  hero: {
    amount: 26,
    amountLH: 30,
    currency: 11,
    currencyLH: 13,
    currencyMarginBottom: 2,
  },
  compact: {
    amount: 19,
    amountLH: 24,
    currency: 9,
    currencyLH: 11,
    currencyMarginBottom: 1,
  },
  default: {
    amount: 20,
    amountLH: 26,
    currency: 10,
    currencyLH: 12,
    currencyMarginBottom: 1,
  },
} as const;

/**
 * Price display: currency label small, top-left of the amount block; amount always two decimals.
 * (`DESIGN-apple.md` — regular weight for numerals.)
 */
export function ValueCurrency({
  amount,
  currency = "MVR",
  size = "default",
  amountTone = "default",
  currencyColor,
  amountColor: amountColorProp,
  amountFontWeight = "400",
  layout = "stack",
}: Props) {
  const formatted = formatMoneyAmount(amount);
  const s = SIZES[size];

  const amountColor =
    amountTone === "danger"
      ? colors.danger
      : (amountColorProp ?? colors.primary);
  const curColor = currencyColor ?? colors.textMuted;
  const useInline = layout === "inline" && size !== "hero";

  const moneyStyle = {
    fontFamily: fontFamilies.body,
    fontWeight: amountFontWeight,
    color: amountColor,
  };

  const amountEl = (
    <Text
      numberOfLines={size === "hero" ? 1 : undefined}
      adjustsFontSizeToFit={size === "hero"}
      minimumFontScale={size === "hero" ? 0.55 : undefined}
      style={{
        ...moneyStyle,
        fontSize: s.amount,
        lineHeight: s.amountLH,
        letterSpacing: size === "hero" ? -0.35 : -0.2,
      }}
    >
      {formatted}
    </Text>
  );

  const currencyTextStyle = {
    fontFamily: fontFamilies.body,
    fontWeight: "500" as const,
    fontSize: s.currency,
    lineHeight: s.currencyLH,
    color: curColor,
    letterSpacing: 0.4,
    marginBottom: useInline ? 0 : s.currencyMarginBottom,
    alignSelf: "flex-start" as const,
  };

  const currencyEl = <Text style={currencyTextStyle}>{currency}</Text>;

  const bodyStack = (
    <View style={{ alignSelf: "flex-start", maxWidth: "100%" }}>
      {currencyEl}
      {amountEl}
    </View>
  );

  const bodyInline = (
    <View
      style={{
        flexDirection: "row",
        alignItems: "baseline",
        flexWrap: "wrap",
        columnGap: 8,
        rowGap: 2,
        maxWidth: "100%",
      }}
    >
      {currencyEl}
      {amountEl}
    </View>
  );

  if (size === "hero") {
    return <View style={{ flexShrink: 1, minWidth: 0 }}>{bodyStack}</View>;
  }

  if (useInline) {
    return (
      <View style={{ maxWidth: "100%", alignSelf: "flex-start" }}>
        {bodyInline}
      </View>
    );
  }

  if (size === "compact") {
    return bodyStack;
  }

  return (
    <View style={{ maxWidth: "100%", alignSelf: "flex-start" }}>
      {bodyStack}
    </View>
  );
}
