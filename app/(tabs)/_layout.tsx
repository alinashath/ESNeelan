import { CreateTabBarButton } from "@/src/components/ui/CreateTabBarButton";
import {
  FloatingGlassTabBar,
  type TabBarOptions,
} from "@/src/components/ui/FloatingGlassTabBar";
import { WebTabsHeaderBar } from "@/src/components/ui/WebTabsHeaderBar";
import { HomeCatalogSearchProvider } from "@/src/context/HomeCatalogSearchContext";
import { useUnreadNotificationCount } from "@/src/data/notifications";
import { floatingTabBarBottomInset } from "@/src/lib/floating-tab-bar";
import { useWebWideTabHeader } from "@/src/lib/web-tabs-layout";
import { layout } from "@/src/theme/layout";
import { colors } from "@/src/theme/tokens";
import { Ionicons } from "@expo/vector-icons";
import { Tabs } from "expo-router";
import { StyleSheet, useWindowDimensions } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const os = process.env.EXPO_OS;
const isWeb = os === "web";

function TabsLayoutInner() {
  const { data: unread = 0 } = useUnreadNotificationCount();
  const wideWebHeader = useWebWideTabHeader();
  const insets = useSafeAreaInsets();

  const useFloatingTabBar = !wideWebHeader;
  const narrowWebBottom = isWeb && !wideWebHeader;
  const sceneBottomInset = useFloatingTabBar ? floatingTabBarBottomInset(insets.bottom) : 0;

  const stackedTabBarStyle = narrowWebBottom
    ? {
        borderTopWidth: StyleSheet.hairlineWidth,
        borderTopColor: colors.border,
        backgroundColor: colors.navBar,
        height: os === "web" ? 60 : os === "ios" ? 92 : 68,
        paddingBottom: os === "web" ? 12 : os === "ios" ? 28 : 10,
        paddingTop: os === "web" ? 10 : 8,
        shadowColor: "#000000",
        shadowOffset: { width: 0, height: -3 },
        shadowOpacity: 0.07,
        shadowRadius: 10,
        elevation: os === "web" ? 0 : 10,
      }
    : {
        borderTopWidth: StyleSheet.hairlineWidth,
        borderTopColor: colors.border,
        backgroundColor: colors.navBar,
        height: os === "ios" ? 92 : 68,
        paddingBottom: os === "ios" ? 28 : 10,
        paddingTop: 8,
        ...(os === "ios"
          ? {
              shadowColor: "#000000",
              shadowOffset: { width: 0, height: -3 },
              shadowOpacity: 0.07,
              shadowRadius: 10,
            }
          : { elevation: 10 }),
      };

  const floatingTabBarStyle = {
    position: "absolute" as const,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "transparent",
    borderTopWidth: 0,
    elevation: 0,
    shadowOpacity: 0,
    height: sceneBottomInset,
  };

  return (
    <Tabs
      tabBar={
        isWeb && wideWebHeader
          ? (props) => <WebTabsHeaderBar {...props} unread={unread} />
          : useFloatingTabBar
            ? (props) => (
                <FloatingGlassTabBar
                  state={props.state}
                  navigation={props.navigation}
                  descriptors={
                    props.descriptors as Record<string, { options: TabBarOptions }>
                  }
                />
              )
            : undefined
      }
      screenOptions={{
        headerShown: false,
        tabBarHideOnKeyboard: true,
        ...(isWeb && wideWebHeader ? { tabBarPosition: "top" as const } : {}),
        ...(useFloatingTabBar
          ? {
              tabBarShowLabel: false,
              sceneStyle: { paddingBottom: sceneBottomInset },
              animation: "fade",
            }
          : {}),
        ...(!useFloatingTabBar && narrowWebBottom ? { tabBarShowLabel: false } : {}),
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarStyle:
          isWeb && wideWebHeader
            ? undefined
            : useFloatingTabBar
              ? floatingTabBarStyle
              : stackedTabBarStyle,
        tabBarLabelStyle: {
          fontSize: narrowWebBottom ? 10 : isWeb ? 12 : 11,
          fontWeight: "600",
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Home",
          tabBarIcon: ({ color, size }) => (
            <Ionicons
              name="home-outline"
              color={color}
              size={narrowWebBottom ? size + 2 : size}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="explore"
        options={{
          title: "Explore",
          ...(isWeb && wideWebHeader ? {} : { href: null }),
          tabBarIcon: ({ color, size }) => (
            <Ionicons
              name="compass-outline"
              color={color}
              size={narrowWebBottom ? size + 2 : size}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="artists"
        options={{
          title: "Stories",
          tabBarIcon: ({ color, size }) => (
            <Ionicons
              name="color-palette-outline"
              color={color}
              size={narrowWebBottom ? size + 2 : size}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="create"
        options={
          isWeb && wideWebHeader
            ? {
                title: "Sell",
                tabBarAccessibilityLabel: "Sell, new auction",
                tabBarIcon: ({ color, size }) => (
                  <Ionicons
                    name="add-circle-outline"
                    color={color}
                    size={size}
                  />
                ),
              }
            : useFloatingTabBar
              ? {
                  title: "Sell",
                  tabBarAccessibilityLabel: "Sell, new auction",
                  tabBarIcon: () => null,
                  tabBarButton: (props) => (
                    <CreateTabBarButton {...props} floating />
                  ),
                }
              : {
                  title: "Sell",
                  tabBarIcon: () => null,
                  tabBarButton: (props) => <CreateTabBarButton {...props} />,
                }
        }
      />
      <Tabs.Screen
        name="notifications"
        options={{
          title: "Alerts",
          ...(isWeb && wideWebHeader ? {} : { href: null }),
          tabBarIcon: ({ color, size }) => (
            <Ionicons
              name="notifications-outline"
              color={color}
              size={narrowWebBottom ? size + 2 : size}
            />
          ),
          tabBarBadge: unread > 0 ? unread : undefined,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: "Profile",
          tabBarIcon: ({ color, size }) => (
            <Ionicons
              name="person-outline"
              color={color}
              size={narrowWebBottom ? size + 2 : size}
            />
          ),
        }}
      />
    </Tabs>
  );
}

export default function TabLayout() {
  /** Re-mount tabs when crossing web breakpoint so tab bar position / custom bar stay in sync. */
  const { width } = useWindowDimensions();
  const wide = isWeb && width >= layout.breakpoints.md;
  const layoutKey = isWeb ? (wide ? "web-wide" : "web-narrow") : "native";

  return (
    <HomeCatalogSearchProvider>
      <TabsLayoutInner key={layoutKey} />
    </HomeCatalogSearchProvider>
  );
}
