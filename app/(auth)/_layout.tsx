import { Stack } from "expo-router";
import { makeRootStackBackHeader } from "@/src/components/ui/RootStackBackButton";
import { colors } from "@/src/theme/tokens";

export default function AuthLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: true,
        headerShadowVisible: false,
        headerStyle: { backgroundColor: colors.background },
        headerTintColor: colors.text,
        headerBackTitle: "Back",
        headerLeft: makeRootStackBackHeader("/(tabs)"),
      }}
    >
      <Stack.Screen name="login" options={{ title: "Log in" }} />
      <Stack.Screen name="signup" options={{ title: "Sign up" }} />
      <Stack.Screen name="verify" options={{ title: "Verify code" }} />
    </Stack>
  );
}
