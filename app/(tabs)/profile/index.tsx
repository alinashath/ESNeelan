import { ButtonPrimary } from "@/src/components/ui/ButtonPrimary";
import { ButtonSecondary } from "@/src/components/ui/ButtonSecondary";
import { ProfileMenuRow } from "@/src/components/ui/ProfileMenuRow";
import { Screen } from "@/src/components/ui/Screen";
import { resolveTabRouteSeo, SiteSeoHead } from "@/src/components/web/SiteSeoHead";
import { TextBody } from "@/src/components/ui/TextBody";
import { TextCaption } from "@/src/components/ui/TextCaption";
import { TextLabel } from "@/src/components/ui/TextLabel";
import { TextTitle } from "@/src/components/ui/TextTitle";
import { getAvatarPublicUrl } from "@/src/lib/avatar";
import { formatDisplayPhone } from "@/src/lib/phone";
import { useAuth } from "@/src/providers/AuthProvider";
import { colors, radii, space } from "@/src/theme/tokens";
import { Ionicons } from "@expo/vector-icons";
import { router, useFocusEffect, type Href } from "expo-router";
import { useCallback, useMemo } from "react";
import { Image, Pressable, View } from "react-native";

function sellerVerificationSubtitle(
  role: string | undefined,
  status: string,
): string {
  if (role === "admin") return "Not required to sell from this account";
  if (status === "approved") return "Verified — open to view status";
  if (status === "pending") return "Documents under review";
  if (status === "rejected") return "Resubmit documents to try again";
  return "Submit ID or business registration to list items";
}

function sellerVerificationStatusLabel(status: string): string {
  if (status === "approved") return "Verified";
  if (status === "pending") return "Under review";
  if (status === "rejected") return "Not approved — tap to resubmit";
  return "Not verified — tap to submit documents";
}

export default function ProfileScreen() {
  const { session, profile, signOut, refreshProfile } = useAuth();

  useFocusEffect(
    useCallback(() => {
      void refreshProfile();
    }, [refreshProfile]),
  );

  const sellerStatus = profile?.seller_verification_status ?? "none";

  const avatarUri = useMemo(
    () => getAvatarPublicUrl(profile?.avatar_storage_path, profile?.updated_at),
    [profile?.avatar_storage_path, profile?.updated_at],
  );

  const sellerCopy = useCallback(() => {
    if (profile?.role === "admin")
      return "Admin accounts may list without seller verification.";
    if (sellerStatus === "approved") {
      return "Verified — submit listings for admin review.";
    }
    if (sellerStatus === "pending") {
      return "Your documents are being reviewed. You will be notified when a decision is made.";
    }
    if (sellerStatus === "rejected") {
      const note = profile?.seller_verification_note;
      return `Not approved${note ? `: ${note}` : ""}. Upload documents and submit again.`;
    }
    return "Upload your ID (individual) or business registration (business), then submit a verification request. An admin must approve you before you can list.";
  }, [
    profile?.role,
    profile?.seller_verification_note,
    sellerStatus,
  ]);

  if (!session) {
    return (
      <>
        <SiteSeoHead {...resolveTabRouteSeo("/profile")} />
        <Screen scroll>
        <TextTitle>Profile</TextTitle>
        <TextBody style={{ marginTop: space.lg }}>
          Sign in with your Maldivian mobile to manage your account.
        </TextBody>
        <ButtonPrimary
          title="Log in"
          onPress={() => router.push("/(auth)/login")}
          style={{ marginTop: space.lg }}
        />
        <ButtonSecondary
          title="Sign up"
          onPress={() => router.push("/(auth)/signup" as Href)}
          style={{ marginTop: space.md }}
        />
      </Screen>
      </>
    );
  }

  return (
    <>
      <SiteSeoHead {...resolveTabRouteSeo("/profile")} />
      <Screen scroll>
      <TextTitle>Profile</TextTitle>
      <TextCaption style={{ marginTop: space.xs, color: colors.textMuted }}>
        Account, listings, and preferences
      </TextCaption>

      {profile?.suspended_at ? (
        <TextBody
          style={{
            marginTop: space.md,
            color: colors.danger,
            fontWeight: "600",
          }}
        >
          Your account is suspended. Contact support.
        </TextBody>
      ) : null}

      <Pressable
        onPress={() => router.push("/profile/edit" as Href)}
        style={({ pressed }) => ({
          marginTop: space.xl,
          flexDirection: "row",
          alignItems: "center",
          padding: space.lg,
          borderRadius: radii.lg,
          borderWidth: 1,
          borderColor: colors.border,
          backgroundColor: pressed ? colors.surfaceMuted : colors.background,
        })}
        accessibilityRole="button"
        accessibilityLabel="Open edit profile"
      >
        <View
          style={{
            width: 72,
            height: 72,
            borderRadius: 36,
            overflow: "hidden",
            borderWidth: 1,
            borderColor: colors.border,
            backgroundColor: colors.surfaceMuted,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          {avatarUri ? (
            <Image
              key={`${profile?.avatar_storage_path ?? "none"}-${profile?.updated_at ?? "none"}`}
              source={{ uri: avatarUri }}
              style={{ width: 72, height: 72 }}
            />
          ) : (
            <TextCaption style={{ fontWeight: "600" }}>Add</TextCaption>
          )}
        </View>
        <View style={{ flex: 1, marginLeft: space.md, minWidth: 0 }}>
          <TextBody
            style={{ fontWeight: "600", fontSize: 18 }}
            numberOfLines={1}
          >
            {profile?.display_name?.trim() || "Your name"}
          </TextBody>
          <TextCaption style={{ marginTop: 4 }} numberOfLines={1}>
            {profile?.phone
              ? formatDisplayPhone(profile.phone)
              : (session.user.phone ?? "—")}
          </TextCaption>
          <TextCaption
            style={{ marginTop: 4, fontWeight: "600", color: colors.primary }}
          >
            {(profile?.role ?? "buyer").toUpperCase()}
            {sellerStatus === "approved" ? " · Verified seller" : ""}
          </TextCaption>
        </View>
        <TextCaption style={{ fontWeight: "600", color: colors.primary }}>
          Edit
        </TextCaption>
      </Pressable>

      {profile?.role !== "admin" ? (
        <Pressable
          onPress={() => router.push("/profile/seller-verification" as Href)}
          accessibilityRole="button"
          accessibilityLabel="Seller verification"
          style={({ pressed }) => ({
            marginTop: space.md,
            flexDirection: "row",
            alignItems: "center",
            padding: space.lg,
            borderRadius: radii.lg,
            borderWidth: 1,
            borderColor: colors.primary,
            backgroundColor: pressed ? colors.accentTint : colors.accentMuted,
          })}
        >
          <View
            style={{
              width: 44,
              height: 44,
              borderRadius: radii.md,
              backgroundColor: colors.surfaceMuted,
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Ionicons name="shield-checkmark-outline" size={22} color={colors.primary} />
          </View>
          <View style={{ flex: 1, marginLeft: space.md, minWidth: 0 }}>
            <TextBody style={{ fontWeight: "600" }}>Seller verification</TextBody>
            <TextCaption style={{ marginTop: 4, color: colors.textSecondary }}>
              {sellerVerificationStatusLabel(sellerStatus)}
            </TextCaption>
          </View>
          <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
        </Pressable>
      ) : null}

      {profile?.role === "admin" ? (
        <View
          style={{
            marginTop: space.lg,
            padding: space.lg,
            borderRadius: radii.lg,
            borderWidth: 1,
            borderColor: colors.border,
            backgroundColor: colors.tertiaryMuted,
          }}
        >
          <TextLabel>ADMIN</TextLabel>
          <TextBody
            style={{ marginTop: space.sm, color: colors.textSecondary }}
          >
            {sellerCopy()}
          </TextBody>
          <ButtonPrimary
            title="Open admin console"
            onPress={() => router.push("/admin")}
            style={{ marginTop: space.md }}
          />
        </View>
      ) : (
        <View
          style={{
            marginTop: space.lg,
            padding: space.lg,
            borderRadius: radii.lg,
            borderWidth: 1,
            borderColor: colors.border,
            backgroundColor: colors.accentMuted,
          }}
        >
          <TextLabel>SELL ON ES NEELAN</TextLabel>
          <TextBody
            style={{ marginTop: space.sm, color: colors.textSecondary }}
          >
            {sellerCopy()}
          </TextBody>
          {sellerStatus === "none" || sellerStatus === "rejected" ? (
            <ButtonPrimary
              title="Submit seller verification"
              onPress={() => router.push("/profile/seller-verification" as Href)}
              style={{ marginTop: space.md }}
            />
          ) : null}
          {sellerStatus === "pending" ? (
            <ButtonPrimary
              title="Verification status"
              onPress={() => router.push("/profile/seller-verification" as Href)}
              style={{ marginTop: space.md }}
            />
          ) : null}
          {sellerStatus === "approved" ? (
            <ButtonSecondary
              title="Seller verification"
              onPress={() => router.push("/profile/seller-verification" as Href)}
              style={{ marginTop: space.md }}
            />
          ) : null}
        </View>
      )}

      <TextLabel style={{ marginTop: space.xxl }}>SHORTCUTS</TextLabel>
      <View style={{ marginTop: space.sm }}>
        <ProfileMenuRow
          icon="create-outline"
          title="Edit profile & address"
          subtitle="Photo, display name, contact & location"
          onPress={() => router.push("/profile/edit" as Href)}
        />
        <ProfileMenuRow
          icon="shield-checkmark-outline"
          title="Seller verification"
          subtitle={sellerVerificationSubtitle(profile?.role, sellerStatus)}
          onPress={() => router.push("/profile/seller-verification" as Href)}
        />
        <ProfileMenuRow
          icon="pulse-outline"
          title="Bid management"
          subtitle="Your bids, wins, and listings you sell"
          onPress={() => router.push("/profile/bid-management" as Href)}
        />
        <ProfileMenuRow
          icon="hammer-outline"
          title="My auctions"
          subtitle="Listings you are selling"
          onPress={() => router.push("/my-auctions")}
        />
        <ProfileMenuRow
          icon="albums-outline"
          title="Collections"
          subtitle="Optional groups for your seller page"
          onPress={() => router.push("/profile/collections" as Href)}
        />
        <ProfileMenuRow
          icon="trophy-outline"
          title="Won auctions"
          subtitle="Lots you won"
          onPress={() => router.push("/won")}
        />
        <ProfileMenuRow
          icon="notifications-outline"
          title="Notifications"
          subtitle="Reminders, bids, and updates"
          onPress={() => router.push("/profile/notifications" as Href)}
        />
      </View>

      <ButtonSecondary
        title="Log out"
        onPress={() => signOut()}
        style={{ marginTop: space.xl }}
      />
    </Screen>
    </>
  );
}
