import { View } from "react-native";
import { colors, space } from "@/src/theme/tokens";
import { ButtonIcon } from "./ButtonIcon";
import { TextDisplay } from "./TextDisplay";

type Props = {
  onBellPress?: () => void;
};

export function HeaderLogoRow({ onBellPress }: Props) {
  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        marginBottom: space.lg,
      }}
    >
      <TextDisplay>BIDSTREAM</TextDisplay>
      <ButtonIcon name="notifications-outline" onPress={onBellPress} />
    </View>
  );
}
