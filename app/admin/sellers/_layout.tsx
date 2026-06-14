import { Stack } from "expo-router";
import { colors } from "@/src/theme/tokens";
import { AdminStackIndexBack } from "@/src/components/ui/AdminStackIndexBack";

export default function AdminSellersLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: true,
        headerTintColor: colors.text,
        headerStyle: { backgroundColor: colors.background },
        headerShadowVisible: false,
      }}
    >
      <Stack.Screen
        name="index"
        options={{
          title: "Seller applications",
          headerLeft: () => <AdminStackIndexBack />,
        }}
      />
      <Stack.Screen name="[id]" options={{ title: "Application" }} />
    </Stack>
  );
}
