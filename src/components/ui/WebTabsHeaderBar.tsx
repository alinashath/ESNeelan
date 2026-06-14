import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter, useSegments, usePathname, type Href } from "expo-router";
import { HeaderBrandMark } from "@/src/components/ui/HeaderLogoRow";
import { colors, goldBorderSubtle, radii, space } from "@/src/theme/tokens";

type RouteLike = { key: string; name: string };

type TabBarProps = {
  state: { index: number; routes: RouteLike[] };
  descriptors: Record<
    string,
    {
      options: {
        title?: string;
        tabBarBadge?: number | string;
      };
    }
  >;
  insets: { top: number; bottom: number; left: number; right: number };
};

const TAB_ICONS: Record<string, keyof typeof Ionicons.glyphMap> = {
  index: "home-outline",
  explore: "compass-outline",
  create: "add-circle-outline",
  "my-bids": "hammer-outline",
  notifications: "notifications-outline",
  profile: "person-outline",
};

function hrefForRoute(name: string): Href {
  if (name === "index") return "/(tabs)";
  return `/(tabs)/${name}` as Href;
}

function useActiveTabRouteName(): string {
  const pathname = usePathname();
  const segments = useSegments();

  if (pathname.startsWith("/create")) return "create";

  const tabSeg = segments[0] === "(tabs)" ? segments[1] : null;
  return (tabSeg as string | undefined) ?? "index";
}

/**
 * Web: single header row — brand left, primary nav links right (site-style).
 */
export function WebTabsHeaderBar(
  props: TabBarProps & { unread: number } & Record<string, unknown>,
) {
  const { state, descriptors, insets, unread } = props;
  const router = useRouter();
  const activeName = useActiveTabRouteName();

  const routes = state.routes;

  return (
    <View
      style={[
        styles.shell,
        {
          paddingTop: insets.top + space.sm,
          paddingBottom: space.md,
          paddingLeft: Math.max(insets.left, space.lg),
          paddingRight: Math.max(insets.right, space.lg),
        },
      ]}
    >
      <View style={styles.row}>
        <View style={styles.brand}>
          <HeaderBrandMark />
        </View>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          showsVerticalScrollIndicator={false}
          bounces={false}
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
        >
          {routes.map((route) => {
            const { options } = descriptors[route.key]!;
            const label = options.title ?? route.name;
            const focused = route.name === activeName;
            const tint = focused ? colors.accent : colors.textMuted;
            const iconName = TAB_ICONS[route.name] ?? "ellipse-outline";
            const rawBadge = options.tabBarBadge;
            const badge =
              route.name === "notifications" && unread > 0
                ? unread
                : typeof rawBadge === "number" && rawBadge > 0
                  ? rawBadge
                  : null;

            return (
              <Pressable
                key={route.key}
                accessibilityRole="tab"
                accessibilityState={{ selected: focused }}
                accessibilityLabel={label}
                onPress={() => router.navigate(hrefForRoute(route.name))}
                style={({ pressed }) => [
                  styles.tab,
                  focused && styles.tabFocused,
                  pressed && styles.tabPressed,
                ]}
              >
                <View style={styles.tabInner}>
                  <View style={styles.iconWrap}>
                    <Ionicons name={iconName} size={18} color={tint} />
                    {badge != null ? (
                      <View style={styles.badge}>
                        <Text style={styles.badgeText}>
                          {badge > 99 ? "99+" : String(badge)}
                        </Text>
                      </View>
                    ) : null}
                  </View>
                  <Text style={[styles.tabLabel, { color: tint }]} numberOfLines={1}>
                    {label}
                  </Text>
                </View>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  shell: {
    backgroundColor: colors.navBar,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 10,
    elevation: 4,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: space.md,
    minHeight: 40,
  },
  brand: {
    flexShrink: 0,
  },
  scroll: {
    flexGrow: 1,
    flexShrink: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: "flex-end",
    alignItems: "center",
    flexDirection: "row",
    gap: space.xs,
    paddingLeft: space.sm,
  },
  tab: {
    borderRadius: radii.pill,
    maxWidth: 200,
  },
  tabFocused: {
    backgroundColor: colors.accentTint,
    borderWidth: 1,
    borderColor: goldBorderSubtle,
  },
  tabPressed: {
    opacity: 0.85,
  },
  tabInner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingVertical: space.sm,
    paddingHorizontal: space.md,
  },
  iconWrap: {
    position: "relative",
    width: 22,
    height: 22,
    alignItems: "center",
    justifyContent: "center",
  },
  tabLabel: {
    fontSize: 12,
    fontWeight: "600",
    letterSpacing: 0.2,
  },
  badge: {
    position: "absolute",
    top: -4,
    right: -8,
    minWidth: 15,
    height: 15,
    paddingHorizontal: 4,
    borderRadius: 8,
    backgroundColor: colors.danger,
    alignItems: "center",
    justifyContent: "center",
  },
  badgeText: {
    color: colors.ivory,
    fontSize: 10,
    fontWeight: "600",
  },
});
