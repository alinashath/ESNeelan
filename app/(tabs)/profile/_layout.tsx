import { makeRootStackBackHeader } from "@/src/components/ui/RootStackBackButton";
import { colors } from "@/src/theme/tokens";
import { Stack } from "expo-router";

export default function ProfileTabStackLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        headerTintColor: colors.text,
        headerShadowVisible: false,
        headerStyle: { backgroundColor: colors.background },
        contentStyle: { backgroundColor: colors.background },
      }}
    >
      <Stack.Screen name="index" options={{ headerShown: false }} />
      <Stack.Screen
        name="edit"
        options={{
          headerShown: true,
          title: "Edit profile",
          headerLeft: makeRootStackBackHeader("/(tabs)/profile"),
          headerBackTitle: "Back",
        }}
      />
      <Stack.Screen
        name="seller-verification"
        options={{
          headerShown: true,
          title: "Seller verification",
          headerLeft: makeRootStackBackHeader("/(tabs)/profile"),
          headerBackTitle: "Back",
        }}
      />
      <Stack.Screen
        name="bid-management"
        options={{
          headerShown: true,
          title: "Bid management",
          headerLeft: makeRootStackBackHeader("/(tabs)/profile"),
          headerBackTitle: "Profile",
        }}
      />
      <Stack.Screen
        name="collections"
        options={{
          headerShown: true,
          title: "Collections",
          headerLeft: makeRootStackBackHeader("/(tabs)/profile"),
          headerBackTitle: "Profile",
        }}
      />
      <Stack.Screen
        name="collection/[id]"
        options={{
          headerShown: true,
          title: "Collection",
          headerLeft: makeRootStackBackHeader("/(tabs)/profile/collections"),
          headerBackTitle: "Collections",
        }}
      />
    </Stack>
  );
}
