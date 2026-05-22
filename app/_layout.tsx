import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { QueryClientProvider } from "@tanstack/react-query";
import { createAppQueryClient } from "@/src/lib/query-client";
import { AuthProvider } from "@/src/providers/AuthProvider";

const queryClient = createAppQueryClient();

export { ErrorBoundary } from "expo-router";

export const unstable_settings = {
  initialRouteName: "index",
};

export default function RootLayout() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <StatusBar style="dark" />
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="index" />
          <Stack.Screen name="(auth)" />
          <Stack.Screen name="(tabs)" />
          <Stack.Screen
            name="auction/[id]"
            options={{ headerShown: true, title: "Auction" }}
          />
          <Stack.Screen
            name="my-auctions"
            options={{ headerShown: true, title: "My auctions" }}
          />
          <Stack.Screen
            name="won"
            options={{ headerShown: true, title: "Won auctions" }}
          />
          <Stack.Screen name="admin" />
        </Stack>
      </AuthProvider>
    </QueryClientProvider>
  );
}
