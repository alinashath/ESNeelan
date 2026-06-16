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
import { SearchField } from "@/src/components/ui/SearchField";
import { useHomeSearchAutocompleteCandidates } from "@/src/lib/use-home-search-autocomplete";
import { useHomeCatalogSearch } from "@/src/context/HomeCatalogSearchContext";
import { useAuth } from "@/src/providers/AuthProvider";
import { colors, radii, space } from "@/src/theme/tokens";

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
  artists: "color-palette-outline",
  create: "add-circle-outline",
  notifications: "notifications-outline",
  profile: "person-outline",
};

/** Primary links in the top bar; alerts + account use the icon cluster. */
const ROUTES_IN_HEADER_SCROLL = new Set([
  "index",
  "explore",
  "artists",
  "create",
]);

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
 * Web: marketing header — brand, primary tabs, home search (shared with catalog),
 * Sign up + alerts + profile (Stitch top nav pattern).
 */
export function WebTabsHeaderBar(
  props: TabBarProps & { unread: number } & Record<string, unknown>,
) {
  const { state, descriptors, insets, unread } = props;
  const router = useRouter();
  const activeName = useActiveTabRouteName();
  const { search, setSearch } = useHomeCatalogSearch();
  const searchAutocompleteCandidates = useHomeSearchAutocompleteCandidates();
  const { session, loading: authLoading } = useAuth();
  const signedIn = !!session;
  const showSignUp = !authLoading && !session;

  const routes = state.routes.filter((r) => ROUTES_IN_HEADER_SCROLL.has(r.name));

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
          style={styles.tabScroll}
          contentContainerStyle={styles.tabScrollContent}
        >
          {routes.map((route) => {
            const { options } = descriptors[route.key]!;
            const label = options.title ?? route.name;
            const focused = route.name === activeName;
            const tint = focused ? colors.primary : colors.textSecondary;
            const iconName = TAB_ICONS[route.name] ?? "ellipse-outline";
            const rawBadge = options.tabBarBadge;
            const badge =
              typeof rawBadge === "number" && rawBadge > 0 ? rawBadge : null;

            return (
              <Pressable
                key={route.key}
                accessibilityRole="tab"
                accessibilityState={{ selected: focused }}
                accessibilityLabel={label}
                onPress={() => router.navigate(hrefForRoute(route.name))}
                style={({ pressed }) => [
                  styles.tab,
                  focused ? styles.tabFocused : styles.tabIdle,
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

        {activeName === "index" ? (
          <View style={styles.searchWrap}>
            <SearchField
              placeholder="Search"
              value={search}
              onChangeText={setSearch}
              suggestions={searchAutocompleteCandidates}
              accessibilityLabel="Search auctions"
            />
          </View>
        ) : (
          <View style={styles.searchSpacer} />
        )}

        <View style={styles.actions}>
          {showSignUp ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Sign up"
              onPress={() => router.push("/(auth)/login" as Href)}
              style={({ pressed }) => [
                styles.signUp,
                pressed && { backgroundColor: colors.accentPressed, opacity: 0.95 },
              ]}
            >
              <Text style={styles.signUpLabel}>Sign up</Text>
            </Pressable>
          ) : null}
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Notifications"
            onPress={() => router.push("/(tabs)/notifications" as Href)}
            style={({ pressed }) => [
              styles.iconHit,
              pressed && styles.tabPressed,
            ]}
          >
            <View style={styles.iconBtn}>
              <Ionicons name="notifications-outline" size={22} color={colors.textSecondary} />
              {unread > 0 ? (
                <View style={styles.headerBadge}>
                  <Text style={styles.badgeText}>{unread > 99 ? "99+" : String(unread)}</Text>
                </View>
              ) : null}
            </View>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Profile"
            onPress={() => router.push("/(tabs)/profile" as Href)}
            style={({ pressed }) => [
              styles.iconHit,
              pressed && styles.tabPressed,
            ]}
          >
            <View style={styles.iconBtn}>
              <Ionicons name="person-outline" size={22} color={colors.textSecondary} />
            </View>
          </Pressable>
        </View>
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
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: space.md,
    minHeight: 48,
  },
  brand: {
    flexShrink: 0,
  },
  tabScroll: {
    flexGrow: 0,
    flexShrink: 1,
    maxWidth: 420,
    minWidth: 0,
  },
  tabScrollContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
    paddingRight: space.xs,
  },
  searchWrap: {
    flex: 1,
    minWidth: 120,
    maxWidth: 480,
    justifyContent: "center",
    overflow: "visible",
    zIndex: 1,
  },
  searchSpacer: {
    flex: 1,
    minWidth: space.sm,
  },
  actions: {
    flexDirection: "row",
    alignItems: "center",
    gap: space.xs,
    flexShrink: 0,
  },
  signUp: {
    backgroundColor: colors.accent,
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: radii.pill,
    marginRight: space.xs,
  },
  signUpLabel: {
    color: colors.onAccent,
    fontSize: 13,
    fontWeight: "600",
    letterSpacing: 0.1,
  },
  iconHit: {
    padding: space.xs,
  },
  iconBtn: {
    position: "relative",
    width: 40,
    height: 40,
    borderRadius: radii.pill,
    backgroundColor: colors.chipIdle,
    alignItems: "center",
    justifyContent: "center",
  },
  headerBadge: {
    position: "absolute",
    top: -2,
    right: -2,
    minWidth: 16,
    height: 16,
    paddingHorizontal: 4,
    borderRadius: 8,
    backgroundColor: colors.danger,
    alignItems: "center",
    justifyContent: "center",
  },
  tab: {
    borderRadius: radii.none,
    borderBottomWidth: 2,
    borderBottomColor: "transparent",
  },
  tabIdle: {},
  tabFocused: {
    borderBottomColor: colors.primary,
  },
  tabPressed: {
    opacity: 0.85,
  },
  tabInner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingVertical: space.sm,
    paddingHorizontal: space.sm,
  },
  iconWrap: {
    position: "relative",
    width: 22,
    height: 22,
    alignItems: "center",
    justifyContent: "center",
  },
  tabLabel: {
    fontSize: 13,
    fontWeight: "600",
    letterSpacing: 0.05,
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
