import { Stack } from "expo-router";
import { colors } from "@/src/theme/tokens";
import { makeRootStackBackHeader } from "@/src/components/ui/RootStackBackButton";

export default function WonAuctionsLayout() {
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
          title: "Won auctions",
          headerLeft: makeRootStackBackHeader("/(tabs)"),
        }}
      />
      <Stack.Screen name="[id]" options={{ title: "Won lot" }} />
    </Stack>
  );
}
