import { View } from "react-native";
import { router, type Href } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { APP_DISPLAY_NAME } from "@/src/lib/brand";
import { useAuth } from "@/src/providers/AuthProvider";
import { useAdminQueueCounts } from "@/src/data/user-auctions";
import { Screen } from "@/src/components/ui/Screen";
import { TextTitle } from "@/src/components/ui/TextTitle";
import { TextBody } from "@/src/components/ui/TextBody";
import { TextCaption } from "@/src/components/ui/TextCaption";
import { AdminMenuTile } from "@/src/components/ui/AdminMenuTile";
import { colors, space } from "@/src/theme/tokens";

export default function AdminHome() {
  const { profile } = useAuth();
  const { data: counts } = useAdminQueueCounts({ enabled: profile?.role === "admin" });
  if (profile?.role !== "admin") {
    return (
      <Screen scroll>
        <TextTitle>Admin</TextTitle>
        <TextBody style={{ marginTop: space.lg }}>You do not have admin access.</TextBody>
      </Screen>
    );
  }

  return (
    <Screen scroll>
      <View style={{ flexDirection: "row", alignItems: "center", gap: space.md, marginBottom: space.sm }}>
        <View
          style={{
            width: 48,
            height: 48,
            borderRadius: 12,
            backgroundColor: colors.primary,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Ionicons name="shield-checkmark" size={26} color={colors.onAccent} />
        </View>
        <View style={{ flex: 1, minWidth: 0 }}>
          <TextTitle style={{ fontSize: 24, letterSpacing: -0.5 }}>{APP_DISPLAY_NAME} Admin</TextTitle>
          <TextCaption style={{ marginTop: 4, color: colors.textMuted }}>
            Operations console — separate from the shopper app
          </TextCaption>
        </View>
      </View>
      <TextBody style={{ marginTop: space.md, color: colors.textSecondary, lineHeight: 22 }}>
        Pick a queue below. Each area opens its own stack with a clear title and back navigation.
      </TextBody>

      <View
        style={{
          marginTop: space.xl,
          flexDirection: "row",
          flexWrap: "wrap",
          justifyContent: "space-between",
        }}
      >
        <AdminMenuTile
          icon="hourglass-outline"
          title="Pending listings"
          subtitle="Approve or reject new auctions"
          tone="coral"
          onPress={() => router.push("/admin/pending")}
        />
        <AdminMenuTile
          icon="wallet-outline"
          title="Fee verification"
          subtitle={
            counts?.awaitingPayment
              ? `${counts.awaitingPayment} featured fee item(s) awaiting verification`
              : "Featured listing fee queue"
          }
          tone="navy"
          onPress={() => router.push("/admin/awaiting-payment" as Href)}
        />
        <AdminMenuTile
          icon="document-text-outline"
          title="Awaiting closure"
          subtitle={
            counts?.awaitingClosure
              ? `${counts.awaitingClosure} in payment stage`
              : "Seller closure forms"
          }
          tone="blue"
          onPress={() => router.push("/admin/awaiting-closure" as Href)}
        />
        <AdminMenuTile
          icon="people-outline"
          title="Users"
          subtitle="Search, suspend, roles"
          tone="navy"
          onPress={() => router.push("/admin/users")}
        />
        <AdminMenuTile
          icon="star-outline"
          title="Home featured"
          subtitle="Spotlight on the home carousel"
          tone="lime"
          onPress={() => router.push("/admin/featured" as Href)}
        />
        <AdminMenuTile
          icon="newspaper-outline"
          title="Featured articles"
          subtitle="Editorial stories on the home feed"
          tone="coral"
          onPress={() => router.push("/admin/articles" as Href)}
        />
        <AdminMenuTile
          icon="ribbon-outline"
          title="Seller applications"
          subtitle="Verify who can list"
          tone="blue"
          onPress={() => router.push("/admin/sellers" as Href)}
        />
        <AdminMenuTile
          icon="settings-outline"
          title="Platform settings"
          subtitle="Fees and app copy"
          tone="navy"
          onPress={() => router.push("/admin/settings" as Href)}
        />
      </View>
    </Screen>
  );
}
