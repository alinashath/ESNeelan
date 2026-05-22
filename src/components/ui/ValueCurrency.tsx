import { TextBody } from "./TextBody";

type Props = { amount: number; currency?: string };

export function ValueCurrency({ amount, currency = "MVR" }: Props) {
  const formatted = new Intl.NumberFormat(undefined, {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(amount);
  return (
    <TextBody style={{ fontWeight: "700", color: "#000", fontSize: 18 }}>
      {formatted} {currency}
    </TextBody>
  );
}
