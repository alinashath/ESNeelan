import { Stack } from "expo-router";
import { colors } from "@/src/theme/tokens";

export default function CreateWizardLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: true,
        headerBackTitle: "Back",
        headerShadowVisible: false,
        headerStyle: { backgroundColor: colors.background },
        headerTintColor: colors.text,
      }}
    >
      <Stack.Screen name="step1-details" options={{ title: "Listing details" }} />
      <Stack.Screen name="step2-terms" options={{ title: "Terms & conditions" }} />
      <Stack.Screen name="step3-payment" options={{ title: "Featured fee" }} />
    </Stack>
  );
}
