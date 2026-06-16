import { Image, Pressable, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Badge } from "@/src/components/ui/Badge";
import { TextBody } from "@/src/components/ui/TextBody";
import { TextCaption } from "@/src/components/ui/TextCaption";
import { formatMoneyAmount } from "@/src/lib/format-money";
import { isAuctionLiveForUi } from "@/src/lib/auction-live";
import { colors, fontFamilies, palette, radii, space, typography } from "@/src/theme/tokens";

export type ManagedListingPreviewCardProps = {
  imageUrl?: string | null;
  title: string;
  status: string;
  statusPill: string;
  statusPillTone?: "live" | "muted" | "urgent";
  currentMvr: number;
  bidCount: number;
  endsAtIso: string | null;
  onManage: () => void;
  onViewLot: () => void;
  manageLabel?: string;
};

export function ManagedListingPreviewCard({
  imageUrl,
  title,
  status,
  statusPill,
  statusPillTone: _tone = "muted",
  currentMvr,
  bidCount,
  endsAtIso,
  onManage,
  onViewLot,
  manageLabel = "Manage listing",
}: ManagedListingPreviewCardProps) {
  const live =
    endsAtIso != null &&
    endsAtIso.trim() !== "" &&
    isAuctionLiveForUi(status, endsAtIso);
  const endsLine =
    endsAtIso && endsAtIso.trim() !== ""
      ? new Date(endsAtIso).toLocaleString(undefined, {
          dateStyle: "medium",
          timeStyle: "short",
        })
      : "—";

  return (
    <View
      style={{
        borderRadius: radii.xl,
        borderWidth: 1,
        borderColor: colors.hairlineSoft,
        backgroundColor: colors.white,
        overflow: "hidden",
      }}
    >
      <View style={{ width: "100%", aspectRatio: 16 / 10, backgroundColor: colors.surfaceMuted }}>
        {imageUrl ? (
          <Image source={{ uri: imageUrl }} style={{ width: "100%", height: "100%" }} resizeMode="cover" />
        ) : (
          <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
            <Ionicons name="image-outline" size={36} color={colors.textMuted} />
          </View>
        )}
        <View
          style={{
            position: "absolute",
            top: space.sm,
            left: space.sm,
            flexDirection: "row",
            flexWrap: "wrap",
            gap: 6,
          }}
        >
          <Badge title={statusPill} variant={live ? "accent" : "neutral"} compact />
        </View>
      </View>

      <View style={{ padding: space.lg, gap: space.md }}>
        <TextBody
          style={{
            ...typography.cardTitle,
            fontFamily: fontFamilies.headingSerif,
            color: palette.onSurface,
            fontSize: 20,
            lineHeight: 26,
            fontWeight: "600",
          }}
          numberOfLines={2}
        >
          {title}
        </TextBody>

        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: space.md }}>
          <View style={{ flex: 1, minWidth: 120 }}>
            <TextCaption
              style={{
                fontWeight: "600",
                letterSpacing: 0.8,
                color: colors.textMuted,
                textTransform: "uppercase",
                fontSize: 10,
              }}
            >
              {live ? "Current bid" : "Price / high bid"}
            </TextCaption>
            <TextBody
              style={{
                marginTop: space.xs,
                fontSize: 18,
                fontWeight: "600",
                color: colors.primary,
              }}
            >
              MVR {formatMoneyAmount(currentMvr)}
            </TextBody>
          </View>
          <View style={{ flex: 1, minWidth: 120 }}>
            <TextCaption
              style={{
                fontWeight: "600",
                letterSpacing: 0.8,
                color: colors.textMuted,
                textTransform: "uppercase",
                fontSize: 10,
              }}
            >
              Bids
            </TextCaption>
            <TextBody style={{ marginTop: space.xs, fontWeight: "500" }}>
              {bidCount} {bidCount === 1 ? "bid" : "bids"}
            </TextBody>
          </View>
        </View>

        <View>
          <TextCaption
            style={{
              fontWeight: "600",
              letterSpacing: 0.8,
              color: colors.textMuted,
              textTransform: "uppercase",
              fontSize: 10,
            }}
          >
            {live ? "Ends" : "Schedule / closed"}
          </TextCaption>
          <TextCaption style={{ marginTop: space.xs, color: colors.textSecondary }}>{endsLine}</TextCaption>
        </View>

        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: space.sm }}>
          <Pressable
            onPress={onManage}
            accessibilityRole="button"
            accessibilityLabel={manageLabel}
            style={({ pressed }) => ({
              flexGrow: 1,
              minWidth: 140,
              paddingVertical: 12,
              paddingHorizontal: space.lg,
              borderRadius: radii.pill,
              backgroundColor: colors.accent,
              opacity: pressed ? 0.92 : 1,
              alignItems: "center",
            })}
          >
            <TextCaption style={{ fontWeight: "700", color: colors.onAccent, fontSize: 14 }}>
              {manageLabel}
            </TextCaption>
          </Pressable>
          <Pressable
            onPress={onViewLot}
            accessibilityRole="button"
            accessibilityLabel="View public lot page"
            style={({ pressed }) => ({
              flexGrow: 1,
              minWidth: 140,
              paddingVertical: 12,
              paddingHorizontal: space.lg,
              borderRadius: radii.pill,
              borderWidth: 1,
              borderColor: colors.border,
              backgroundColor: pressed ? colors.surfaceMuted : colors.secondaryContainer,
              alignItems: "center",
            })}
          >
            <TextCaption style={{ fontWeight: "600", color: colors.text, fontSize: 14 }}>View lot</TextCaption>
          </Pressable>
        </View>
      </View>
    </View>
  );
}
