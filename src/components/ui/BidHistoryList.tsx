import { View } from "react-native";
import { space } from "@/src/theme/tokens";
import { TextBody } from "./TextBody";
import { TextCaption } from "./TextCaption";

export type BidRow = {
  id: string;
  amount: number;
  created_at: string;
  bidder_display?: string | null;
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
            <TextBody style={{ fontWeight: "600" }}>
              {new Intl.NumberFormat().format(b.amount)} MVR
            </TextBody>
            <TextCaption>{b.bidder_display ?? "Bidder"}</TextCaption>
          </View>
          <TextCaption>
            {new Date(b.created_at).toLocaleString()}
          </TextCaption>
        </View>
      ))}
    </View>
  );
}
