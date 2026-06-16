import { Children } from "react";
import { ScrollView, View, type ViewStyle } from "react-native";
import { space } from "@/src/theme/tokens";

type Props = {
  children: React.ReactNode;
  style?: ViewStyle;
  /** Tighter horizontal spacing between chips. */
  dense?: boolean;
};

export function ChipRow({ children, style, dense }: Props) {
  const gap = dense ? space.xs : space.sm;
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      showsVerticalScrollIndicator={false}
      contentContainerStyle={[{ paddingVertical: dense ? 2 : space.xs }, style]}
    >
      {Children.map(children, (child, i) => (
        <View key={i} style={{ marginRight: gap }}>
          {child}
        </View>
      ))}
    </ScrollView>
  );
}
