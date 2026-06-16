import { View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { colors, fontFamilies, space } from "@/src/theme/tokens";
import { ButtonIcon } from "./ButtonIcon";
import { TextDisplay } from "./TextDisplay";

type Props = {
  onBellPress?: () => void;
  /** Wordmark next to the mark (default ES Neelan). */
  wordmark?: string;
};

/** Brand mark + wordmark (ES Neelan web nav / home). */
export function HeaderBrandMark({ wordmark = "ES Neelan" }: { wordmark?: string }) {
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: space.sm }}>
      <View
        style={{
          width: 28,
          height: 28,
          borderRadius: 6,
          backgroundColor: colors.primary,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Ionicons name="hammer" size={16} color={colors.onAccent} />
      </View>
      <TextDisplay
        style={{
          letterSpacing: 0.5,
          fontSize: 18,
          fontWeight: "400",
          fontFamily: fontFamilies.headingSerif,
        }}
      >
        {wordmark}
      </TextDisplay>
    </View>
  );
}

/** Home header — brand + optional bell. */
export function HeaderLogoRow({ onBellPress, wordmark = "ES Neelan" }: Props) {
  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        marginBottom: space.lg,
      }}
    >
      <HeaderBrandMark wordmark={wordmark} />
      <ButtonIcon name="notifications-outline" onPress={onBellPress} />
    </View>
  );
}
