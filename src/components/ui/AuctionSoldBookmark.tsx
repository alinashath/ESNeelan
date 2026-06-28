import { colors, fontFamilies } from "@/src/theme/tokens";
import { Text, View, type ViewStyle } from "react-native";

type Props = {
  style?: ViewStyle;
  size?: "default" | "hero";
};

/**
 * Top-right corner ribbon — sold / settled lots (featured heroes + list cards).
 */
export function AuctionSoldBookmark({ style, size = "default" }: Props) {
  const hero = size === "hero";
  const ribbonW = hero ? 112 : 88;
  const top = hero ? 14 : 10;
  const right = hero ? -30 : -24;
  const padV = hero ? 5 : 4;

  return (
    <View
      pointerEvents="none"
      style={[
        {
          position: "absolute",
          top: 0,
          right: 0,
          width: hero ? 80 : 64,
          height: hero ? 80 : 64,
          overflow: "hidden",
        },
        style,
      ]}
    >
      <View
        style={{
          position: "absolute",
          top,
          right,
          width: ribbonW,
          backgroundColor: colors.accent,
          transform: [{ rotate: "45deg" }],
          paddingVertical: padV,
          alignItems: "center",
          shadowColor: "#000",
          shadowOpacity: 0.18,
          shadowRadius: 4,
          shadowOffset: { width: 0, height: 2 },
          elevation: 3,
        }}
      >
        <Text
          style={{
            color: colors.white,
            fontWeight: "700",
            fontSize: hero ? 10 : 9,
            letterSpacing: 1,
            fontFamily: fontFamilies.body,
            textTransform: "uppercase",
          }}
        >
          Sold
        </Text>
      </View>
    </View>
  );
}
