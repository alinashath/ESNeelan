import { Stack } from "expo-router";
import { colors } from "@/src/theme/tokens";
import { AdminStackIndexBack } from "@/src/components/ui/AdminStackIndexBack";

export default function AdminPendingLayout() {
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
          title: "Pending listings",
          headerLeft: () => <AdminStackIndexBack />,
        }}
      />
      <Stack.Screen name="[id]" options={{ title: "Review listing" }} />
    </Stack>
  );
}
