import { Stack } from "expo-router";
import { colors } from "@/src/theme/tokens";
import { makeRootStackBackHeader } from "@/src/components/ui/RootStackBackButton";

export default function SellersLayout() {
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
          title: "Sellers",
          headerLeft: makeRootStackBackHeader("/(tabs)"),
        }}
      />
    </Stack>
  );
}
