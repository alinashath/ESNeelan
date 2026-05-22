import { Children } from "react";
import { ScrollView, View, type ViewStyle } from "react-native";
import { space } from "@/src/theme/tokens";

type Props = {
  children: React.ReactNode;
  style?: ViewStyle;
};

export function ChipRow({ children, style }: Props) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={[{ paddingVertical: space.xs }, style]}
    >
      {Children.map(children, (child, i) => (
        <View key={i} style={{ marginRight: space.sm }}>
          {child}
        </View>
      ))}
    </ScrollView>
  );
}
