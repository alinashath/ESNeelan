import { View } from "react-native";
import { colors, radii, space } from "@/src/theme/tokens";
import { TextBody } from "./TextBody";
import { TextCaption } from "./TextCaption";
import { ButtonSecondary } from "./ButtonSecondary";

type Props = {
  displayName: string;
  onMessagePress?: () => void;
};

export function SellerCard({ displayName, onMessagePress }: Props) {
  return (
    <View
      style={{
        borderWidth: 1,
        borderColor: colors.border,
        borderRadius: radii.lg,
        padding: space.lg,
        backgroundColor: colors.surfaceMuted,
      }}
    >
      <TextCaption style={{ marginBottom: space.xs }}>SELLER</TextCaption>
      <TextBody style={{ fontWeight: "700", fontSize: 18 }}>{displayName}</TextBody>
      {onMessagePress ? (
        <ButtonSecondary
          title="Message"
          onPress={onMessagePress}
          style={{ marginTop: space.md }}
        />
      ) : null}
    </View>
  );
}
