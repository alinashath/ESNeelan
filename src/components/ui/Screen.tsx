import { useCallback, useState, type ReactNode } from "react";
import {
  ScrollView,
  View,
  type LayoutChangeEvent,
  type ScrollViewProps,
  type ViewProps,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { ContentWidthProvider } from "@/src/components/layout/content-width";
import { layout } from "@/src/theme/layout";
import { colors, space } from "@/src/theme/tokens";

const isWeb = process.env.EXPO_OS === "web";

type Props = ViewProps & {
  scroll?: boolean;
  scrollProps?: ScrollViewProps;
  /** When true, scroll content has no horizontal/top padding (use for edge-to-edge heroes). */
  noPadding?: boolean;
  children: ReactNode;
};

export function Screen({
  children,
  style,
  scroll,
  scrollProps,
  noPadding,
  ...rest
}: Props) {
  const [contentWidth, setContentWidth] = useState<number | undefined>(
    undefined,
  );
  const onColumnLayout = useCallback((e: LayoutChangeEvent) => {
    const w = e.nativeEvent.layout.width;
    if (w > 0) setContentWidth(w);
  }, []);

  const columnShell = (child: ReactNode) => {
    if (!isWeb) {
      return <ContentWidthProvider width={undefined}>{child}</ContentWidthProvider>;
    }
    return (
      <View
        style={{
          flex: 1,
          width: "100%",
          maxWidth: layout.maxContentWidth,
          alignSelf: "center",
        }}
        onLayout={onColumnLayout}
      >
        <ContentWidthProvider width={contentWidth}>{child}</ContentWidthProvider>
      </View>
    );
  };

  if (scroll) {
    const baseInset = noPadding
      ? { paddingHorizontal: 0, paddingTop: 0, paddingBottom: space.xxl }
      : { padding: space.lg, paddingBottom: space.xxl };
    const { contentContainerStyle: userContent, ...restScroll } =
      scrollProps ?? {};
    const mergedContent = userContent
      ? [baseInset, userContent]
      : baseInset;
    return (
      <SafeAreaView
        style={[{ flex: 1, backgroundColor: colors.background }, style]}
        edges={["top", "left", "right"]}
        {...rest}
      >
        {columnShell(
          <ScrollView
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
            showsHorizontalScrollIndicator={false}
            {...restScroll}
            contentContainerStyle={mergedContent}
          >
            {children}
          </ScrollView>,
        )}
      </SafeAreaView>
    );
  }
  return (
    <SafeAreaView
      style={[{ flex: 1, backgroundColor: colors.background }, style]}
      edges={["top", "left", "right"]}
      {...rest}
    >
      {columnShell(<View style={{ flex: 1, padding: space.lg }}>{children}</View>)}
    </SafeAreaView>
  );
}
