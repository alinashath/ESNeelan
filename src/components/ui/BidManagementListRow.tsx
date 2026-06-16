import { Image, Pressable, Text, useWindowDimensions, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { colors, fontFamilies, radii, space, typography } from "@/src/theme/tokens";

const THUMB = 92;

export type BidManagementMetaLine = { label: string; value: string; emphasize?: boolean };

type Props = {
  imageUrl?: string | null;
  title: string;
  /** e.g. Live, Closed, WON — beside title */
  statusPill?: string;
  statusPillTone?: "live" | "muted" | "urgent";
  metaLines: BidManagementMetaLine[];
  /** Primary CTA (e.g. Pay & settle, Manage listing) */
  primaryAction?: { label: string; onPress: () => void };
  /** Opens public auction page */
  onViewLot: () => void;
  viewLotLabel?: string;
};

function statusTextStyle(tone: NonNullable<Props["statusPillTone"]>) {
  if (tone === "live") return { color: colors.accent };
  if (tone === "urgent") return { color: colors.danger };
  return { color: colors.textMuted };
}

function chunkMetaPairs(lines: BidManagementMetaLine[]): BidManagementMetaLine[][] {
  const rows: BidManagementMetaLine[][] = [];
  for (let i = 0; i < lines.length; i += 2) {
    rows.push(lines.slice(i, i + 2));
  }
  return rows;
}

/** Uppercase meta labels — same rhythm as `HomeFeaturedHero` (“Current bid”). */
function StatBlock({ line }: { line: BidManagementMetaLine }) {
  return (
    <View style={{ flex: 1, minWidth: 0 }}>
      <Text
        style={{
          fontSize: 10,
          fontWeight: "400",
          letterSpacing: 0.6,
          color: colors.textMuted,
          fontFamily: fontFamilies.body,
          textTransform: "uppercase",
          marginBottom: space.xs,
        }}
        numberOfLines={1}
      >
        {line.label}
      </Text>
      <Text
        style={{
          fontSize: 16,
          lineHeight: 22,
          fontWeight: line.emphasize ? "600" : "500",
          color: line.emphasize ? colors.primary : colors.textSecondary,
          fontFamily: fontFamilies.body,
        }}
        numberOfLines={2}
      >
        {line.value}
      </Text>
    </View>
  );
}

/**
 * Bid / win / listing management row — horizontal “lot manager” card:
 * thumbnail, title + status, 2-column stat grid, stacked pill actions.
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
  const compact = width < 400;
  const pairs = chunkMetaPairs(metaLines);
  const st = statusTextStyle(statusPillTone);

  const actions = (
    <View
      style={{
        justifyContent: "center",
        gap: space.sm,
        flexShrink: 0,
        minWidth: compact ? undefined : 112,
        flexDirection: "column",
        alignSelf: compact ? "stretch" : "flex-start",
      }}
    >
      <Pressable
        onPress={onViewLot}
        accessibilityRole="button"
        accessibilityLabel={`${viewLotLabel} for ${title}`}
        style={({ pressed }) => ({
          paddingVertical: 10,
          paddingHorizontal: space.md,
          borderRadius: radii.pill,
          backgroundColor: pressed ? colors.hairlineSoft : colors.secondaryContainer,
          alignItems: "center",
          justifyContent: "center",
          minHeight: 44,
        })}
      >
        <Text
          style={{
            fontSize: 13,
            fontWeight: "600",
            color: colors.text,
            fontFamily: fontFamilies.body,
            letterSpacing: 0.2,
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
            paddingVertical: 10,
            paddingHorizontal: space.md,
            borderRadius: radii.pill,
            backgroundColor: colors.accent,
            opacity: pressed ? 0.9 : 1,
            alignItems: "center",
            justifyContent: "center",
            minHeight: 44,
          })}
        >
          <Text
            style={{
              fontSize: 13,
              fontWeight: "600",
              color: colors.onAccent,
              fontFamily: fontFamilies.body,
              letterSpacing: 0.2,
            }}
          >
            {primaryAction.label}
          </Text>
        </Pressable>
      ) : null}
    </View>
  );

  const body = (
    <View style={{ flex: 1, minWidth: 0 }}>
      <View style={{ flexDirection: "row", alignItems: "flex-start", flexWrap: "wrap", gap: space.xs }}>
        <Text
          style={[
            typography.cardTitle,
            {
              flex: 1,
              flexBasis: 120,
              minWidth: 0,
            },
          ]}
          numberOfLines={2}
        >
          {title}
        </Text>
        {statusPill ? (
          <Text
            style={{
              fontSize: 11,
              fontWeight: "600",
              letterSpacing: 0.6,
              fontFamily: fontFamilies.body,
              marginTop: 2,
              ...st,
            }}
          >
            {statusPill}
          </Text>
        ) : null}
      </View>

      <View style={{ marginTop: space.md, gap: space.sm }}>
        {pairs.map((pair, ri) => (
          <View key={`row-${ri}`} style={{ flexDirection: "row", gap: space.lg }}>
            {pair.map((line, ci) => (
              <StatBlock key={`${line.label}-${ci}`} line={line} />
            ))}
            {pair.length === 1 ? <View style={{ flex: 1 }} /> : null}
          </View>
        ))}
      </View>
    </View>
  );

  return (
    <View
      style={{
        borderRadius: radii.xl,
        borderWidth: 1,
        borderColor: colors.border,
        backgroundColor: colors.white,
        padding: space.md,
        gap: space.md,
      }}
    >
      {compact ? (
        <>
          <View style={{ flexDirection: "row", gap: space.md, alignItems: "flex-start" }}>
            <View
              style={{
                width: THUMB,
                height: THUMB,
                borderRadius: radii.md,
                overflow: "hidden",
                backgroundColor: colors.surfaceMuted,
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
            {body}
          </View>
          {actions}
        </>
      ) : (
        <View style={{ flexDirection: "row", gap: space.md, alignItems: "stretch" }}>
          <View
            style={{
              width: THUMB,
              height: THUMB,
              borderRadius: radii.md,
              overflow: "hidden",
              backgroundColor: colors.surfaceMuted,
              flexShrink: 0,
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
          {body}
          {actions}
        </View>
      )}
    </View>
  );
}
