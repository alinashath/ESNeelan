import { Image, Pressable, View, Text, useWindowDimensions } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { colors, fontFamilies, radii, space } from "@/src/theme/tokens";
import { TextCaption } from "./TextCaption";

const THUMB = 72;

export type BidManagementMetaLine = { label: string; value: string; emphasize?: boolean };

type Props = {
  imageUrl?: string | null;
  title: string;
  /** e.g. LIVE, ENDED, WON */
  statusPill?: string;
  statusPillTone?: "live" | "muted" | "urgent";
  metaLines: BidManagementMetaLine[];
  /** Primary CTA (e.g. Settle payment, Manage listing) */
  primaryAction?: { label: string; onPress: () => void };
  /** Always opens auction / lot context — design: "View Lot" */
  onViewLot: () => void;
  viewLotLabel?: string;
};

function pillColors(tone: NonNullable<Props["statusPillTone"]>) {
  if (tone === "live") {
    return {
      bg: "rgba(46,204,138,0.12)",
      border: "rgba(46,204,138,0.35)",
      fg: colors.success,
    };
  }
  if (tone === "urgent") {
    return {
      bg: "rgba(232,85,85,0.12)",
      border: "rgba(232,85,85,0.35)",
      fg: colors.danger,
    };
  }
  return {
    bg: colors.tertiaryMuted,
    border: colors.border,
    fg: colors.textMuted,
  };
}

/**
 * Dense bid / win / listing management row — not the auction detail page;
 * summary + **View lot** + optional primary action (pay, manage).
 */
export function BidManagementListRow({
  imageUrl,
  title,
  statusPill,
  statusPillTone = "muted",
  metaLines,
  primaryAction,
  onViewLot,
  viewLotLabel = "View lot",
}: Props) {
  const { width } = useWindowDimensions();
  const stackActions = width < 420;
  const pc = pillColors(statusPillTone);
  return (
    <View
      style={{
        flexDirection: stackActions ? "column" : "row",
        alignItems: stackActions ? "stretch" : "stretch",
        gap: space.md,
        padding: space.md,
        borderRadius: radii.md,
        borderWidth: 1,
        borderColor: colors.border,
        backgroundColor: colors.surfaceMuted,
      }}
    >
      <View style={{ flexDirection: "row", gap: space.md, flex: stackActions ? undefined : 1, minWidth: 0 }}>
      <View
        style={{
          width: THUMB,
          height: THUMB,
          borderRadius: radii.sm,
          overflow: "hidden",
          backgroundColor: colors.background,
        }}
      >
        {imageUrl ? (
          <Image source={{ uri: imageUrl }} style={{ width: "100%", height: "100%" }} resizeMode="cover" />
        ) : (
          <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
            <Ionicons name="image-outline" size={28} color={colors.textMuted} />
          </View>
        )}
      </View>

      <View style={{ flex: 1, minWidth: 0 }}>
        <View style={{ flexDirection: "row", alignItems: "flex-start", gap: space.sm }}>
          <Text
            style={{
              flex: 1,
              fontFamily: fontFamilies.displayMedium,
              fontSize: 16,
              fontWeight: "600",
              color: colors.text,
              lineHeight: 22,
            }}
            numberOfLines={2}
          >
            {title}
          </Text>
          {statusPill ? (
            <View
              style={{
                paddingHorizontal: space.sm,
                paddingVertical: 4,
                borderRadius: radii.pill,
                backgroundColor: pc.bg,
                borderWidth: 1,
                borderColor: pc.border,
                flexShrink: 0,
              }}
            >
              <Text
                style={{
                  fontSize: 9,
                  fontWeight: "600",
                  letterSpacing: 1,
                  color: pc.fg,
                  fontFamily: fontFamilies.bodySemiBold,
                }}
              >
                {statusPill}
              </Text>
            </View>
          ) : null}
        </View>

        {metaLines.map((line, i) => (
          <View
            key={`${line.label}-${i}`}
            style={{ flexDirection: "row", flexWrap: "wrap", marginTop: i === 0 ? space.xs : 4, gap: 4 }}
          >
            <TextCaption style={{ fontWeight: "600", color: colors.textMuted }}>{line.label}</TextCaption>
            <TextCaption
              style={{
                fontWeight: line.emphasize ? "600" : "400",
                color: line.emphasize ? colors.accent : colors.textSecondary,
              }}
            >
              {line.value}
            </TextCaption>
          </View>
        ))}
      </View>
      </View>

      <View
        style={{
          justifyContent: "center",
          gap: space.sm,
          flexShrink: 0,
          flexDirection: stackActions ? "row" : "column",
          minWidth: stackActions ? undefined : 100,
        }}
      >
        <Pressable
          onPress={onViewLot}
          accessibilityRole="button"
          accessibilityLabel={`${viewLotLabel} for ${title}`}
          style={({ pressed }) => ({
            paddingVertical: space.sm,
            paddingHorizontal: space.md,
            borderRadius: radii.pill,
            borderWidth: 1,
            borderColor: colors.accent,
            backgroundColor: pressed ? colors.accentTint : "transparent",
            alignItems: "center",
          })}
        >
          <Text
            style={{
              fontSize: 12,
              fontWeight: "600",
              color: colors.accent,
              fontFamily: fontFamilies.bodySemiBold,
            }}
          >
            {viewLotLabel}
          </Text>
        </Pressable>
        {primaryAction ? (
          <Pressable
            onPress={primaryAction.onPress}
            accessibilityRole="button"
            accessibilityLabel={primaryAction.label}
            style={({ pressed }) => ({
              paddingVertical: space.sm,
              paddingHorizontal: space.md,
              borderRadius: radii.pill,
              backgroundColor: colors.accent,
              opacity: pressed ? 0.88 : 1,
              alignItems: "center",
            })}
          >
            <Text
              style={{
                fontSize: 12,
                fontWeight: "600",
                color: colors.onAccent,
                fontFamily: fontFamilies.bodySemiBold,
              }}
            >
              {primaryAction.label}
            </Text>
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}
