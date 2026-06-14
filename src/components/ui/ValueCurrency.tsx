import { Text } from "react-native";
import { colors, fontFamilies, typography } from "@/src/theme/tokens";

type Props = {
  amount: number;
  currency?: string;
  /** Hero current bid on auction detail. */
  size?: "default" | "hero" | "compact";
};

/** Bid amounts: Inter semibold (BIDMASTER_DESIGN / ES Neelan). */
export function ValueCurrency({ amount, currency = "MVR", size = "default" }: Props) {
  const formatted = new Intl.NumberFormat(undefined, {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(amount);

  const moneyStyle = {
    fontFamily: fontFamilies.bodySemiBold,
    fontWeight: "600" as const,
    color: colors.accent,
  };

  const money = (
    <>
      <Text style={moneyStyle}>{formatted}</Text>
      <Text style={{ ...moneyStyle, fontWeight: "500", letterSpacing: 0.3 }}> {currency}</Text>
    </>
  );

  if (size === "hero") {
    return (
      <Text
        numberOfLines={1}
        adjustsFontSizeToFit
        minimumFontScale={0.55}
        style={{
          fontSize: 26,
          letterSpacing: -0.4,
          flexShrink: 1,
        }}
      >
        {money}
      </Text>
    );
  }

  if (size === "compact") {
    return (
      <Text
        style={{
          fontSize: 19,
          lineHeight: 24,
        }}
      >
        {money}
      </Text>
    );
  }

  return (
    <Text
      style={[
        typography.body,
        {
          fontWeight: "600",
          color: colors.accent,
          fontSize: 20,
          lineHeight: 26,
          fontFamily: fontFamilies.bodySemiBold,
        },
      ]}
    >
      {money}
    </Text>
  );
}
