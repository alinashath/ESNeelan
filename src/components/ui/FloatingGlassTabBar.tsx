import {
  FLOATING_TAB_BAR_HEIGHT,
  FLOATING_TAB_BAR_MARGIN_BOTTOM,
  FLOATING_TAB_BAR_MARGIN_H,
  FloatingTabBarGlass,
  floatingTabActiveColor,
  floatingTabInactiveColor,
  floatingTabIndicatorStyle,
  floatingTabSlotStyle,
} from "@/src/lib/floating-tab-bar";
import { easingEnter } from "@/src/lib/ui-motion";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

type RouteLike = { key: string; name: string; params?: object };

export type TabBarOptions = {
  title?: string;
  tabBarLabel?: unknown;
  tabBarAccessibilityLabel?: string;
  tabBarTestID?: string;
  tabBarShowLabel?: boolean;
  href?: string | null;
  tabBarItemStyle?: { display?: "none" | "flex" | string };
  tabBarIcon?: (props: { focused: boolean; color: string; size: number }) => ReactNode;
  tabBarButton?: (props: Record<string, unknown>) => ReactNode;
};

type TabBarProps = {
  state: { index: number; routes: RouteLike[] };
  descriptors: Record<string, { options: TabBarOptions }>;
  navigation: {
    emit: (event: { type: string; target: string; canPreventDefault?: boolean }) => {
      defaultPrevented: boolean;
    };
    navigate: (name: string, params?: object) => void;
  };
};

const ICON_SIZE = 26;
/** Fixed pill — centered in each tab slot behind the icon. */
const INDICATOR_WIDTH = 52;
const INDICATOR_HEIGHT = 44;

function isTabBarRouteVisible(options: TabBarOptions | undefined): boolean {
  if (!options) return true;
  if (options.href === null) return false;
  if (options.tabBarItemStyle?.display === "none") return false;
  return true;
}

function TabBarIconSlot({
  focused,
  children,
}: {
  focused: boolean;
  children: ReactNode;
}) {
  const scale = useSharedValue(focused ? 1.06 : 1);
  const opacity = useSharedValue(focused ? 1 : 0.78);

  useEffect(() => {
    scale.value = withSpring(focused ? 1.06 : 1, { damping: 16, stiffness: 280 });
    opacity.value = withTiming(focused ? 1 : 0.78, {
      duration: focused ? 180 : 120,
      easing: easingEnter,
    });
  }, [focused, opacity, scale]);

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: opacity.value,
  }));

  return (
    <Animated.View
      style={{
        width: ICON_SIZE,
        height: ICON_SIZE,
        alignItems: "center",
        justifyContent: "center",
        zIndex: 1,
      }}
    >
      <Animated.View style={animStyle}>{children}</Animated.View>
    </Animated.View>
  );
}

/** Instagram-style floating glass tab bar with animated active indicator (mobile). */
export function FloatingGlassTabBar({ state, descriptors, navigation }: TabBarProps) {
  const insets = useSafeAreaInsets();
  const [barWidth, setBarWidth] = useState(0);

  const visibleRoutes = useMemo(
    () =>
      state.routes.filter((route) =>
        isTabBarRouteVisible(descriptors[route.key]?.options),
      ),
    [descriptors, state.routes],
  );

  const tabCount = Math.max(visibleRoutes.length, 1);
  const tabWidth = barWidth / tabCount;

  const activeRouteKey = state.routes[state.index]?.key;
  const visibleIndex = Math.max(
    0,
    visibleRoutes.findIndex((route) => route.key === activeRouteKey),
  );

  const indicatorX = useSharedValue(0);

  useEffect(() => {
    if (tabWidth <= 0) return;
    const centeredLeft = visibleIndex * tabWidth + (tabWidth - INDICATOR_WIDTH) / 2;
    indicatorX.value = withSpring(centeredLeft, {
      damping: 18,
      stiffness: 240,
      mass: 0.85,
    });
  }, [indicatorX, tabWidth, visibleIndex]);

  const indicatorStyle = useAnimatedStyle(() => ({
    width: INDICATOR_WIDTH,
    transform: [{ translateX: indicatorX.value }],
  }));

  return (
    <View
      pointerEvents="box-none"
      style={{
        position: "absolute",
        left: FLOATING_TAB_BAR_MARGIN_H,
        right: FLOATING_TAB_BAR_MARGIN_H,
        bottom: insets.bottom + FLOATING_TAB_BAR_MARGIN_BOTTOM,
      }}
    >
      <FloatingTabBarGlass style={{ height: FLOATING_TAB_BAR_HEIGHT }}>
        <View
          style={styles.row}
          onLayout={(e) => setBarWidth(e.nativeEvent.layout.width)}
        >
          {barWidth > 0 ? (
            <Animated.View
              pointerEvents="none"
              style={[
                styles.indicator,
                floatingTabIndicatorStyle,
                indicatorStyle,
              ]}
            />
          ) : null}

          {visibleRoutes.map((route) => {
            const index = state.routes.findIndex((r) => r.key === route.key);
            const { options } = descriptors[route.key];
            const isFocused = state.index === index;
            const color = isFocused ? floatingTabActiveColor : floatingTabInactiveColor;

            const onPress = () => {
              const event = navigation.emit({
                type: "tabPress",
                target: route.key,
                canPreventDefault: true,
              });
              if (!isFocused && !event.defaultPrevented) {
                navigation.navigate(route.name, route.params);
              }
            };

            const onLongPress = () => {
              navigation.emit({
                type: "tabLongPress",
                target: route.key,
              });
            };

            const TabBarButton = options.tabBarButton;
            if (TabBarButton) {
              return (
                <TabBarButton
                  key={route.key}
                  accessibilityRole="button"
                  accessibilityState={isFocused ? { selected: true } : {}}
                  accessibilityLabel={options.tabBarAccessibilityLabel}
                  testID={options.tabBarTestID}
                  onPress={onPress}
                  onLongPress={onLongPress}
                  style={floatingTabSlotStyle}
                />
              );
            }

            const label =
              typeof options.tabBarLabel === "string"
                ? options.tabBarLabel
                : (options.title ?? route.name);

            return (
              <Pressable
                key={route.key}
                accessibilityRole="button"
                accessibilityState={isFocused ? { selected: true } : {}}
                accessibilityLabel={options.tabBarAccessibilityLabel ?? label}
                testID={options.tabBarTestID}
                onPress={onPress}
                onLongPress={onLongPress}
                style={floatingTabSlotStyle}
              >
                <TabBarIconSlot focused={isFocused}>
                  {options.tabBarIcon?.({
                    focused: isFocused,
                    color,
                    size: ICON_SIZE,
                  })}
                </TabBarIconSlot>
              </Pressable>
            );
          })}
        </View>
      </FloatingTabBarGlass>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    height: FLOATING_TAB_BAR_HEIGHT,
    width: "100%",
  },
  indicator: {
    position: "absolute",
    top: (FLOATING_TAB_BAR_HEIGHT - INDICATOR_HEIGHT) / 2,
    height: INDICATOR_HEIGHT,
  },
});
