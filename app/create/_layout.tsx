import { Stack, type Href } from "expo-router";
import { makeRootStackBackHeader } from "@/src/components/ui/RootStackBackButton";
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
        headerLeft: makeRootStackBackHeader("/(tabs)" as Href, colors.text),
      }}
    >
      <Stack.Screen name="step1-details" options={{ title: "New listing" }} />
      <Stack.Screen name="step2-terms" options={{ title: "Platform terms" }} />
      <Stack.Screen name="step3-payment" options={{ title: "Featured fee" }} />
    </Stack>
  );
}
