import { space } from "@/src/theme/tokens";
import { View } from "react-native";
import { TextCaption } from "./TextCaption";
import { ValueCurrency } from "./ValueCurrency";

export type BidRow = {
  id: string;
  amount: number;
  created_at: string;
  bidder_display?: string | null;
  /** Public avatars bucket URL when the bidder has a profile photo. */
  bidder_avatar_url?: string | null;
};

type Props = { bids: BidRow[] };

export function BidHistoryList({ bids }: Props) {
  return (
    <View>
      {bids.map((b) => (
        <View
          key={b.id}
          style={{
            flexDirection: "row",
            justifyContent: "space-between",
            paddingVertical: space.sm,
            borderBottomWidth: 1,
            borderBottomColor: "#eee",
          }}
        >
          <View>
            <ValueCurrency amount={b.amount} size="compact" />
            <TextCaption>{b.bidder_display ?? "Bidder"}</TextCaption>
          </View>
          <TextCaption>{new Date(b.created_at).toLocaleString()}</TextCaption>
        </View>
      ))}
    </View>
  );
}
