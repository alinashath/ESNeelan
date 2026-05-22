import { Image, Pressable, View } from "react-native";
import { useState } from "react";
import { Ionicons } from "@expo/vector-icons";
import { colors, radii, space } from "@/src/theme/tokens";

type Props = {
  imageUrls: string[];
};

export function AuctionImageCarousel({ imageUrls }: Props) {
  const [idx, setIdx] = useState(0);
  if (!imageUrls.length) {
    return (
      <View
        style={{
          height: 260,
          borderRadius: radii.lg,
          backgroundColor: colors.surfaceMuted,
        }}
      />
    );
  }
  const uri = imageUrls[idx % imageUrls.length];
  return (
    <View>
      <Image
        source={{ uri }}
        style={{ width: "100%", height: 260, borderRadius: radii.lg }}
        resizeMode="cover"
      />
      {imageUrls.length > 1 ? (
        <View
          style={{
            position: "absolute",
            top: "40%",
            width: "100%",
            flexDirection: "row",
            justifyContent: "space-between",
            paddingHorizontal: space.md,
          }}
        >
          <Pressable
            onPress={() => setIdx((i) => (i - 1 + imageUrls.length) % imageUrls.length)}
            style={{
              backgroundColor: "rgba(255,255,255,0.85)",
              padding: space.sm,
              borderRadius: radii.pill,
            }}
          >
            <Ionicons name="chevron-back" size={22} color={colors.primary} />
          </Pressable>
          <Pressable
            onPress={() => setIdx((i) => (i + 1) % imageUrls.length)}
            style={{
              backgroundColor: "rgba(255,255,255,0.85)",
              padding: space.sm,
              borderRadius: radii.pill,
            }}
          >
            <Ionicons name="chevron-forward" size={22} color={colors.primary} />
          </Pressable>
        </View>
      ) : null}
    </View>
  );
}
