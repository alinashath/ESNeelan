import { APP_DISPLAY_NAME } from "@/src/lib/brand";
import { Image, View } from "react-native";
import { router, type Href } from "expo-router";
import { fontFamilies, space } from "@/src/theme/tokens";
import { ButtonIcon } from "./ButtonIcon";
import { TextDisplay } from "./TextDisplay";

const brandIcon = require("../../../assets/images/brand-icon.png");

type Props = {
  onBellPress?: () => void;
  /** Wordmark next to the mark (default AUC). */
  wordmark?: string;
};

/** Brand mark + wordmark (AUC web nav / home). */
export function HeaderBrandMark({ wordmark = APP_DISPLAY_NAME }: { wordmark?: string }) {
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: space.sm }}>
      <Image
        source={brandIcon}
        style={{ width: 28, height: 28, borderRadius: 6 }}
        resizeMode="contain"
        accessibilityIgnoresInvertColors
      />
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
export function HeaderLogoRow({ onBellPress, wordmark = APP_DISPLAY_NAME }: Props) {
  const openAlerts =
    onBellPress ?? (() => router.push("/(tabs)/notifications" as Href));

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
      <ButtonIcon name="notifications-outline" onPress={openAlerts} />
    </View>
  );
}
