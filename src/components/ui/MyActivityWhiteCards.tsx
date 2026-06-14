import { useEffect, useState } from "react";
import { Image, Pressable, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { colors, fontMono, radii, space, shadows } from "@/src/theme/tokens";
import { TextBody } from "./TextBody";
import { TextCaption } from "./TextCaption";
import { ValueCurrency } from "./ValueCurrency";
import { ButtonPrimary } from "./ButtonPrimary";
import { ButtonSecondary } from "./ButtonSecondary";
import { isAuctionLiveForUi } from "@/src/lib/auction-live";

export type ActivityTabKey = "active" | "won" | "listings";

const IMG_H = 168;

function pad2(n: number) {
  return n.toString().padStart(2, "0");
}

/** Monospace countdown for activity cards (days + clock within day). */
function formatActivityCountdown(endsAt: string): string {
  const sec = Math.max(0, Math.floor((new Date(endsAt).getTime() - Date.now()) / 1000));
  if (sec <= 0) return "00:00:00";
  const d = Math.floor(sec / 86400);
  const h = Math.floor((sec % 86400) / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = sec % 60;
  if (d > 0) return `${d}d ${pad2(h)}:${pad2(m)}:${pad2(s)}`;
  return `${pad2(h)}:${pad2(m)}:${pad2(s)}`;
}

function isEndingSoon(endsAt: string) {
  const ms = new Date(endsAt).getTime() - Date.now();
  return ms > 0 && ms < 3600 * 1000;
}

const cardOuter = {
  borderRadius: radii.lg,
  borderWidth: 1,
  borderColor: colors.border,
  backgroundColor: colors.background,
  overflow: "hidden" as const,
  ...shadows.card,
};

type TabsProps = {
  tab: ActivityTabKey;
  onChange: (t: ActivityTabKey) => void;
};

/** Stitch “My Bids (White)” — underline segment control. */
export function ActivityUnderlineTabs({ tab, onChange }: TabsProps) {
  const items: { key: ActivityTabKey; label: string }[] = [
    { key: "active", label: "My bids" },
    { key: "won", label: "Won" },
    { key: "listings", label: "My listings" },
  ];
  return (
    <View style={{ marginBottom: space.lg }}>
      <View style={{ flexDirection: "row" }}>
        {items.map((it) => {
          const sel = tab === it.key;
          return (
            <Pressable
              key={it.key}
              onPress={() => onChange(it.key)}
              style={{ flex: 1, paddingVertical: space.md, alignItems: "center" }}
            >
              <Text
                style={{
                  fontSize: 14,
                  fontWeight: sel ? "600" : "500",
                  color: sel ? colors.primary : colors.textMuted,
                  textAlign: "center",
                }}
                numberOfLines={1}
              >
                {it.label}
              </Text>
              <View
                style={{
                  marginTop: space.sm,
                  height: 3,
                  width: "100%",
                  backgroundColor: sel ? colors.primary : "transparent",
                  borderRadius: 2,
                }}
              />
            </Pressable>
          );
        })}
      </View>
      <View style={{ height: 1, backgroundColor: colors.border, marginTop: -1 }} />
    </View>
  );
}

type ActiveProps = {
  imageUrl: string | null | undefined;
  title: string;
  subtitle?: string | null;
  endsAt: string;
  currentBid: number;
  bidCount: number;
  yourBid: number;
  leading: boolean;
  onPress: () => void;
};

/** Active bid row — image overlays, lime status, recessed bid strip, black CTA. */
export function MyActivityActiveBidCard({
  imageUrl,
  title,
  subtitle,
  endsAt,
  currentBid,
  bidCount,
  yourBid,
  leading,
  onPress,
}: ActiveProps) {
  const [clock, setClock] = useState(() => formatActivityCountdown(endsAt));
  const liveUi = isAuctionLiveForUi("active", endsAt);
  const soon = liveUi && isEndingSoon(endsAt);

  useEffect(() => {
    const t = setInterval(() => setClock(formatActivityCountdown(endsAt)), 1000);
    return () => clearInterval(t);
  }, [endsAt]);

  return (
    <View style={{ ...cardOuter }}>
      <View style={{ height: IMG_H, backgroundColor: colors.surfaceMuted }}>
        {imageUrl ? (
          <Image source={{ uri: imageUrl }} style={{ width: "100%", height: "100%" }} resizeMode="cover" />
        ) : null}
        {liveUi ? (
          soon ? (
            <View
              style={{
                position: "absolute",
                top: space.sm,
                right: space.sm,
                flexDirection: "row",
                alignItems: "center",
                gap: 6,
                backgroundColor: colors.accent,
                paddingHorizontal: space.md,
                paddingVertical: 6,
                borderRadius: radii.pill,
              }}
            >
              <Ionicons name="time-outline" size={14} color={colors.primary} />
              <Text style={{ fontWeight: "900", fontSize: 11, color: colors.primary, letterSpacing: 0.5 }}>
                ENDING SOON
              </Text>
            </View>
          ) : (
            <View
              style={{
                position: "absolute",
                top: space.sm,
                right: space.sm,
                flexDirection: "row",
                alignItems: "center",
                gap: 8,
                backgroundColor: colors.surfaceMuted,
                paddingHorizontal: space.md,
                paddingVertical: 8,
                borderRadius: radii.pill,
                borderWidth: 1,
                borderColor: colors.border,
              }}
            >
              <View
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: 4,
                  backgroundColor: colors.accent,
                }}
              />
              <Text
                style={{
                  fontWeight: "600",
                  fontSize: 13,
                  color: colors.primary,
                  fontFamily: fontMono,
                  letterSpacing: 0.5,
                }}
              >
                {clock}
              </Text>
            </View>
          )
        ) : (
          <View
            style={{
              position: "absolute",
              top: space.sm,
              right: space.sm,
              backgroundColor: colors.surfaceMuted,
              paddingHorizontal: space.md,
              paddingVertical: 6,
              borderRadius: radii.pill,
              borderWidth: 1,
              borderColor: colors.border,
            }}
          >
            <Text style={{ fontWeight: "900", fontSize: 11, color: colors.textSecondary, letterSpacing: 0.6 }}>
              BIDDING CLOSED
            </Text>
          </View>
        )}
      </View>

      <View style={{ padding: space.lg }}>
        <View style={{ flexDirection: "row", alignItems: "flex-start", gap: space.sm }}>
          <TextBody style={{ fontWeight: "600", fontSize: 17, flex: 1 }} numberOfLines={2}>
            {title}
          </TextBody>
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              gap: 4,
              backgroundColor: colors.accent,
              paddingHorizontal: space.sm,
              paddingVertical: 6,
              borderRadius: radii.pill,
              flexShrink: 0,
            }}
          >
            <Ionicons
              name={leading ? "checkmark-circle" : "warning"}
              size={14}
              color={colors.primary}
            />
            <Text style={{ fontWeight: "900", fontSize: 10, color: colors.primary, letterSpacing: 0.6 }}>
              {leading ? "LEADING" : "OUTBID"}
            </Text>
          </View>
        </View>
        {subtitle ? (
          <TextCaption style={{ marginTop: space.xs, color: colors.textMuted }} numberOfLines={2}>
            {subtitle}
          </TextCaption>
        ) : null}

        <View
          style={{
            marginTop: space.lg,
            borderWidth: 1,
            borderColor: colors.border,
            borderRadius: radii.sm,
            backgroundColor: colors.surfaceMuted,
            padding: space.md,
            flexDirection: "row",
          }}
        >
          <View style={{ flex: 1, minWidth: 0 }}>
            <TextCaption style={{ fontWeight: "600", color: colors.textMuted }}>Current Bid</TextCaption>
            <View style={{ marginTop: 4 }}>
              <ValueCurrency amount={currentBid} />
            </View>
          </View>
          <View style={{ flex: 1, minWidth: 0, alignItems: "flex-end" }}>
            <TextCaption style={{ fontWeight: "600", color: colors.textMuted }}>
              {leading ? "Bids" : "Your Bid"}
            </TextCaption>
            {leading ? (
              <Text style={{ marginTop: 4, fontSize: 18, fontWeight: "600", color: colors.primary }}>
                {bidCount}
              </Text>
            ) : (
              <View style={{ marginTop: 4 }}>
                <Text style={{ fontSize: 18, fontWeight: "600", color: colors.danger }}>
                  {new Intl.NumberFormat(undefined, {
                    minimumFractionDigits: 0,
                    maximumFractionDigits: 2,
                  }).format(yourBid)}{" "}
                  MVR
                </Text>
              </View>
            )}
          </View>
        </View>

        <ButtonPrimary
          title={leading ? "Increase Bid" : "Reclaim Lead"}
          onPress={onPress}
          style={{ marginTop: space.lg, borderRadius: radii.sm }}
        />
      </View>
    </View>
  );
}

type ListingProps = {
  imageUrl: string | null | undefined;
  title: string;
  subtitle?: string | null;
  status: string;
  /** When set, `active` after `ends_at` is not shown as LIVE. */
  endsAt?: string | null;
  currentBid: number;
  bidCount: number;
  onManage: () => void;
  showMarkPaid?: boolean;
  onMarkPaid?: () => void;
};

function listingStatusLabel(status: string, endsAt?: string | null): string {
  const s = status.toLowerCase();
  if (s === "active") return isAuctionLiveForUi("active", endsAt) ? "LIVE" : "CLOSED";
  if (s === "pending_approval") return "PENDING";
  if (s === "draft") return "DRAFT";
  return status.replace(/_/g, " ").toUpperCase();
}

/** Seller listing — same white card chrome as active bids (Stitch My Listings). */
export function MyActivityListingCard({
  imageUrl,
  title,
  subtitle,
  status,
  endsAt,
  currentBid,
  bidCount,
  onManage,
  showMarkPaid,
  onMarkPaid,
}: ListingProps) {
  const live = isAuctionLiveForUi(status, endsAt);
  return (
    <View style={{ ...cardOuter }}>
      <View style={{ height: IMG_H, backgroundColor: colors.surfaceMuted }}>
        {imageUrl ? (
          <Image source={{ uri: imageUrl }} style={{ width: "100%", height: "100%" }} resizeMode="cover" />
        ) : null}
        <View
          style={{
            position: "absolute",
            top: space.sm,
            right: space.sm,
            backgroundColor: live ? colors.accent : colors.surfaceMuted,
            paddingHorizontal: space.md,
            paddingVertical: 6,
            borderRadius: radii.pill,
            borderWidth: live ? 0 : 1,
            borderColor: colors.border,
          }}
        >
          <Text style={{ fontWeight: "900", fontSize: 11, color: colors.primary, letterSpacing: 0.6 }}>
            {listingStatusLabel(status, endsAt)}
          </Text>
        </View>
      </View>

      <View style={{ padding: space.lg }}>
        <TextBody style={{ fontWeight: "600", fontSize: 17 }} numberOfLines={2}>
          {title}
        </TextBody>
        {subtitle ? (
          <TextCaption style={{ marginTop: space.xs, color: colors.textMuted }} numberOfLines={2}>
            {subtitle}
          </TextCaption>
        ) : null}

        <View
          style={{
            marginTop: space.lg,
            borderWidth: 1,
            borderColor: colors.border,
            borderRadius: radii.sm,
            backgroundColor: colors.surfaceMuted,
            padding: space.md,
            flexDirection: "row",
          }}
        >
          <View style={{ flex: 1, minWidth: 0 }}>
            <TextCaption style={{ fontWeight: "600", color: colors.textMuted }}>Current Bid</TextCaption>
            <View style={{ marginTop: 4 }}>
              <ValueCurrency amount={currentBid} />
            </View>
          </View>
          <View style={{ flex: 1, minWidth: 0, alignItems: "flex-end" }}>
            <TextCaption style={{ fontWeight: "600", color: colors.textMuted }}>Bids</TextCaption>
            <Text style={{ marginTop: 4, fontSize: 18, fontWeight: "600", color: colors.primary }}>
              {bidCount}
            </Text>
          </View>
        </View>

        <ButtonPrimary
          title="Manage listing"
          onPress={onManage}
          style={{ marginTop: space.lg, borderRadius: radii.sm }}
        />
        {showMarkPaid && onMarkPaid ? (
          <ButtonSecondary title="Mark paid" onPress={onMarkPaid} style={{ marginTop: space.sm }} />
        ) : null}
      </View>
    </View>
  );
}

type WonProps = {
  imageUrl: string | null | undefined;
  title: string;
  status: string;
  amount: number;
  payment?: string | null;
  onOpen: () => void;
};

export function MyActivityWonCard({ imageUrl, title, status, amount, payment, onOpen }: WonProps) {
  return (
    <View style={{ ...cardOuter }}>
      <View style={{ height: IMG_H, backgroundColor: colors.surfaceMuted }}>
        {imageUrl ? (
          <Image source={{ uri: imageUrl }} style={{ width: "100%", height: "100%" }} resizeMode="cover" />
        ) : null}
      </View>
      <View style={{ padding: space.lg }}>
        <TextBody style={{ fontWeight: "600", fontSize: 17 }} numberOfLines={2}>
          {title}
        </TextBody>
        <TextCaption style={{ marginTop: space.xs, color: colors.textMuted }}>{status}</TextCaption>
        <View style={{ marginTop: space.md }}>
          <TextCaption style={{ fontWeight: "600", color: colors.textMuted }}>Winning bid</TextCaption>
          <ValueCurrency amount={amount} />
        </View>
        {payment ? (
          <View
            style={{
              marginTop: space.lg,
              padding: space.md,
              backgroundColor: colors.surfaceMuted,
              borderRadius: radii.sm,
              borderWidth: 1,
              borderColor: colors.border,
            }}
          >
            <View style={{ flexDirection: "row", alignItems: "center", gap: space.sm }}>
              <Ionicons name="business-outline" size={20} color={colors.primary} />
              <TextBody style={{ fontWeight: "600", flex: 1 }}>Pay the seller</TextBody>
            </View>
            <TextBody style={{ marginTop: space.sm, color: colors.textSecondary }}>{payment}</TextBody>
          </View>
        ) : null}
        <ButtonPrimary title="Open lot" onPress={onOpen} style={{ marginTop: space.lg, borderRadius: radii.sm }} />
      </View>
    </View>
  );
}
