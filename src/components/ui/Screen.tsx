import {
  ScrollView,
  View,
  type ScrollViewProps,
  type ViewProps,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { colors, space } from "@/src/theme/tokens";

type Props = ViewProps & {
  scroll?: boolean;
  scrollProps?: ScrollViewProps;
  children: React.ReactNode;
};

export function Screen({
  children,
  style,
  scroll,
  scrollProps,
  ...rest
}: Props) {
  if (scroll) {
    return (
      <SafeAreaView
        style={[{ flex: 1, backgroundColor: colors.background }, style]}
        edges={["top", "left", "right"]}
        {...rest}
      >
        <ScrollView
          contentContainerStyle={{ padding: space.lg, paddingBottom: space.xxl }}
          keyboardShouldPersistTaps="handled"
          {...scrollProps}
        >
          {children}
        </ScrollView>
      </SafeAreaView>
    );
  }
  return (
    <SafeAreaView
      style={[{ flex: 1, backgroundColor: colors.background }, style]}
      edges={["top", "left", "right"]}
      {...rest}
    >
      <View style={{ flex: 1, padding: space.lg }}>{children}</View>
    </SafeAreaView>
  );
}
