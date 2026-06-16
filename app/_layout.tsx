import { Stack, type Href } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { QueryClientProvider } from "@tanstack/react-query";
import { createAppQueryClient } from "@/src/lib/query-client";
import { useAuctionCatalogRealtimeSync } from "@/src/lib/use-auction-catalog-realtime";
import { AuthProvider } from "@/src/providers/AuthProvider";
import { BidmasterFontsProvider } from "@/src/providers/BidmasterFontsProvider";
import { makeRootStackBackHeader } from "@/src/components/ui/RootStackBackButton";
import { colors } from "@/src/theme/tokens";

const queryClient = createAppQueryClient();

function AuctionCatalogRealtimeSync() {
  useAuctionCatalogRealtimeSync();
  return null;
}

export { ErrorBoundary } from "expo-router";

export const unstable_settings = {
  initialRouteName: "index",
};

export default function RootLayout() {
  return (
    <QueryClientProvider client={queryClient}>
      <BidmasterFontsProvider>
        <AuthProvider>
          <AuctionCatalogRealtimeSync />
          <StatusBar style="dark" />
          <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="index" />
          <Stack.Screen name="(auth)" />
          <Stack.Screen name="(tabs)" options={{ title: "Home" }} />
          <Stack.Screen
            name="auction/[id]"
            options={{
              headerShown: true,
              headerTransparent: true,
              headerTitle: "",
              headerTintColor: colors.primary,
              headerShadowVisible: false,
              headerLeft: makeRootStackBackHeader("/(tabs)", colors.primary, true),
              animation: "slide_from_right",
              gestureEnabled: true,
              fullScreenGestureEnabled: true,
            }}
          />
          <Stack.Screen
            name="my-auctions"
            options={{ headerShown: false, title: "My auctions" }}
          />
          <Stack.Screen name="won" options={{ headerShown: false, title: "Won auctions" }} />
          <Stack.Screen name="admin" />
          <Stack.Screen name="create" options={{ headerShown: false, title: "Sell" }} />
          <Stack.Screen
            name="auction/closure/[id]"
            options={{
              headerShown: true,
              title: "Closure",
              headerTintColor: colors.text,
              headerShadowVisible: false,
              headerStyle: { backgroundColor: colors.background },
              headerLeft: makeRootStackBackHeader("/(tabs)" as Href, colors.text),
            }}
          />
          <Stack.Screen
            name="auction/feedback/[id]"
            options={{
              headerShown: true,
              title: "Feedback",
              headerTintColor: colors.text,
              headerShadowVisible: false,
              headerStyle: { backgroundColor: colors.background },
              headerLeft: makeRootStackBackHeader("/(tabs)" as Href, colors.text),
            }}
          />
          <Stack.Screen
            name="seller/[id]"
            options={{
              headerShown: true,
              title: "Seller",
              headerTintColor: colors.text,
              headerShadowVisible: false,
              headerStyle: { backgroundColor: colors.background },
              headerLeft: makeRootStackBackHeader("/(tabs)" as Href, colors.text),
            }}
          />
          <Stack.Screen
            name="collection/[id]"
            options={{
              headerShown: true,
              title: "Collection",
              headerTintColor: colors.text,
              headerShadowVisible: false,
              headerStyle: { backgroundColor: colors.background },
              headerLeft: makeRootStackBackHeader("/(tabs)" as Href, colors.text),
            }}
          />
          <Stack.Screen name="categories" options={{ headerShown: false, title: "Categories" }} />
          <Stack.Screen name="sellers" options={{ headerShown: false, title: "Sellers" }} />
          <Stack.Screen
            name="article/[slug]"
            options={{
              headerShown: true,
              title: "Article",
              headerTintColor: colors.text,
              headerShadowVisible: false,
              headerStyle: { backgroundColor: colors.background },
              headerLeft: makeRootStackBackHeader("/(tabs)" as Href, colors.text),
            }}
          />
        </Stack>
        </AuthProvider>
      </BidmasterFontsProvider>
    </QueryClientProvider>
  );
}
