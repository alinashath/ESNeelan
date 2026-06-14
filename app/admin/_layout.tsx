import { Redirect, Stack, type Href } from "expo-router";
import { useAuth } from "@/src/providers/AuthProvider";
import { AdminExitToTabsProfile } from "@/src/components/ui/AdminExitToTabsProfile";
import { makeRootStackBackHeader } from "@/src/components/ui/RootStackBackButton";
import { colors } from "@/src/theme/tokens";

export default function AdminLayout() {
  const { profile, loading } = useAuth();
  if (!loading && profile?.role !== "admin") {
    return <Redirect href="/(tabs)/profile" />;
  }

  return (
    <Stack
      screenOptions={{
        headerShown: true,
        headerTitle: "Admin",
        headerShadowVisible: false,
        headerStyle: { backgroundColor: colors.background },
        headerTintColor: colors.text,
        headerBackTitle: "Back",
      }}
    >
      <Stack.Screen
        name="index"
        options={{
          title: "Console",
          headerLeft: () => <AdminExitToTabsProfile />,
        }}
      />
      <Stack.Screen name="pending" options={{ headerShown: false, title: "Pending" }} />
      <Stack.Screen name="users" options={{ headerShown: false, title: "Users" }} />
      <Stack.Screen
        name="featured"
        options={{
          title: "Home featured",
          headerLeft: makeRootStackBackHeader("/admin" as Href, colors.text),
        }}
      />
      <Stack.Screen
        name="settings"
        options={{
          title: "Platform settings",
          headerLeft: makeRootStackBackHeader("/admin" as Href, colors.text),
        }}
      />
      <Stack.Screen name="sellers" options={{ headerShown: false, title: "Sellers" }} />
      <Stack.Screen
        name="awaiting-payment"
        options={{
          title: "Fee verification",
          headerLeft: makeRootStackBackHeader("/admin" as Href, colors.text),
        }}
      />
      <Stack.Screen
        name="awaiting-closure"
        options={{
          title: "Awaiting closure",
          headerLeft: makeRootStackBackHeader("/admin" as Href, colors.text),
        }}
      />
      <Stack.Screen
        name="auction/[id]"
        options={{
          title: "Auction",
          headerLeft: makeRootStackBackHeader("/admin" as Href, colors.text),
        }}
      />
    </Stack>
  );
}
