import { Ionicons } from "@expo/vector-icons";
import { Tabs } from "expo-router";
import { StyleSheet, useWindowDimensions } from "react-native";
import { WebTabsHeaderBar } from "@/src/components/ui/WebTabsHeaderBar";
import { colors } from "@/src/theme/tokens";
import { CreateTabBarButton } from "@/src/components/ui/CreateTabBarButton";
import { useUnreadNotificationCount } from "@/src/data/notifications";
import { layout } from "@/src/theme/layout";
import { useWebWideTabHeader } from "@/src/lib/web-tabs-layout";

const os = process.env.EXPO_OS;
const isWeb = os === "web";

function TabsLayoutInner() {
  const { data: unread = 0 } = useUnreadNotificationCount();
  const wideWebHeader = useWebWideTabHeader();

  const tabBarHeight = os === "ios" ? 92 : 68;
  const tabBarPadBottom = os === "ios" ? 28 : 10;

  const narrowWebBottom = isWeb && !wideWebHeader;

  return (
    <Tabs
      tabBar={
        isWeb && wideWebHeader
          ? (props) => <WebTabsHeaderBar {...props} unread={unread} />
          : undefined
      }
      screenOptions={{
        headerShown: false,
        tabBarHideOnKeyboard: true,
        ...(isWeb && wideWebHeader ? { tabBarPosition: "top" as const } : {}),
        ...(narrowWebBottom ? { tabBarShowLabel: false } : {}),
        tabBarActiveTintColor: colors.accent,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarStyle: isWeb && wideWebHeader
          ? undefined
          : narrowWebBottom
            ? {
                borderTopWidth: StyleSheet.hairlineWidth,
                borderTopColor: colors.border,
                backgroundColor: colors.navBar,
                height: os === "web" ? 60 : tabBarHeight,
                paddingBottom: os === "web" ? 12 : tabBarPadBottom,
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
                height: tabBarHeight,
                paddingBottom: tabBarPadBottom,
                paddingTop: 8,
                ...(os === "ios"
                  ? {
                      shadowColor: "#000000",
                      shadowOffset: { width: 0, height: -3 },
                      shadowOpacity: 0.07,
                      shadowRadius: 10,
                    }
                  : { elevation: 10 }),
              },
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
            <Ionicons name="home-outline" color={color} size={narrowWebBottom ? size + 2 : size} />
          ),
        }}
      />
      <Tabs.Screen
        name="explore"
        options={{
          title: "Explore",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="compass-outline" color={color} size={narrowWebBottom ? size + 2 : size} />
          ),
        }}
      />
      <Tabs.Screen
        name="create"
        options={
          isWeb && wideWebHeader
            ? {
                title: "List yourself",
                tabBarAccessibilityLabel: "List yourself, new auction",
                tabBarIcon: ({ color, size }) => (
                  <Ionicons name="add-circle-outline" color={color} size={size} />
                ),
              }
            : isWeb
              ? {
                  title: "List yourself",
                  tabBarAccessibilityLabel: "List yourself, new auction",
                  tabBarIcon: ({ color, size }) => (
                    <Ionicons name="add-circle-outline" color={color} size={size + 2} />
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
        name="my-bids"
        options={{
          title: "Bids",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="hammer-outline" color={color} size={narrowWebBottom ? size + 2 : size} />
          ),
        }}
      />
      <Tabs.Screen
        name="notifications"
        options={{
          title: "Alerts",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="notifications-outline" color={color} size={narrowWebBottom ? size + 2 : size} />
          ),
          tabBarBadge: unread > 0 ? unread : undefined,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: "Profile",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="person-outline" color={color} size={narrowWebBottom ? size + 2 : size} />
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

  return <TabsLayoutInner key={layoutKey} />;
}
