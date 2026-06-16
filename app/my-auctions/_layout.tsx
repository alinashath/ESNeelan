import { Stack } from "expo-router";
import { colors } from "@/src/theme/tokens";
import { makeRootStackBackHeader } from "@/src/components/ui/RootStackBackButton";

export default function MyAuctionsLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: true,
        headerTintColor: colors.text,
        headerStyle: { backgroundColor: colors.background },
        headerShadowVisible: false,
        headerBackTitle: "Back",
      }}
    >
      <Stack.Screen
        name="index"
        options={{
          title: "My auctions",
          headerLeft: makeRootStackBackHeader("/(tabs)"),
        }}
      />
      <Stack.Screen name="[id]" options={{ title: "Manage listing" }} />
      <Stack.Screen name="featured-fee" options={{ title: "Featured listing fee" }} />
    </Stack>
  );
}
