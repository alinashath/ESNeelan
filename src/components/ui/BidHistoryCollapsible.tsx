import {
  durationPanelCloseMs,
  durationPanelOpenMs,
  easingEnter,
} from "@/src/lib/ui-motion";
import { colors, radii, shadows, space } from "@/src/theme/tokens";
import { Ionicons } from "@expo/vector-icons";
import { useEffect, useMemo, useState, type ComponentType, type ReactNode } from "react";
import {
  Image,
  LayoutChangeEvent,
  Platform,
  Pressable,
  View,
  type ViewProps,
} from "react-native";
import Animated, {
  FadeIn,
  FadeInDown,
  FadeOut,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import Svg, { Path } from "react-native-svg";
import { formatMoneyAmount } from "@/src/lib/format-money";
import type { BidRow } from "./BidHistoryList";
import { TextBody } from "./TextBody";
import { TextCaption } from "./TextCaption";
import { ValueCurrency } from "./ValueCurrency";

type Props = {
  bids: BidRow[];
  /** Newest-first bids use the next row as prior high; falls back to this for the oldest bid. */
  startingPrice?: number;
};

const LATEST_DETAIL = 3;
const CHART_H = 128;
const CHART_PAD_X = 10;
const CHART_PAD_Y = 14;
const NODE = 10;

function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase();
  return (parts[0]![0]! + parts[1]![0]!).toUpperCase();
}

function formatRelative(iso: string) {
  const sec = Math.max(
    0,
    Math.floor((Date.now() - new Date(iso).getTime()) / 1000),
  );
  if (sec < 60) return "just now";
  const m = Math.floor(sec / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  return `${d}d ago`;
}

function BidderAvatar({
  name,
  avatarUrl,
  size = 36,
}: {
  name: string;
  avatarUrl?: string | null;
  size?: number;
}) {
  if (avatarUrl) {
    return (
      <Image
        source={{ uri: avatarUrl }}
        style={{
          width: size,
          height: size,
          borderRadius: size / 2,
          borderWidth: 1,
          borderColor: colors.border,
        }}
        resizeMode="cover"
        accessibilityIgnoresInvertColors
      />
    );
  }
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: colors.tertiaryMuted,
        alignItems: "center",
        justifyContent: "center",
        borderWidth: 1,
        borderColor: colors.border,
      }}
    >
      <TextCaption style={{ fontWeight: "500", color: colors.primary, fontSize: 11 }}>
        {initials(name)}
      </TextCaption>
    </View>
  );
}

type WebHoverViewProps = ViewProps & {
  onMouseEnter?: () => void;
  onMouseLeave?: () => void;
};

const WebHoverView = View as unknown as ComponentType<WebHoverViewProps>;

function HoverCell({
  children,
  onHoverIn,
  onHoverOut,
  style,
}: {
  children: ReactNode;
  onHoverIn: () => void;
  onHoverOut: () => void;
  style?: ViewProps["style"];
}) {
  if (Platform.OS === "web") {
    return (
      <WebHoverView style={style} onMouseEnter={onHoverIn} onMouseLeave={onHoverOut}>
        {children}
      </WebHoverView>
    );
  }
  return <View style={style}>{children}</View>;
}

type Point = { bid: BidRow; x: number; y: number; index: number };

function buildStepLayout(bidsChrono: BidRow[], width: number): Point[] | null {
  if (!bidsChrono.length || width < 40) return null;
  const amounts = bidsChrono.map((b) => b.amount);
  const minA = Math.min(...amounts);
  const maxA = Math.max(...amounts);
  const span = Math.max(maxA - minA, 1e-9);
  const n = bidsChrono.length;
  const innerW = Math.max(1, width - CHART_PAD_X * 2);
  const innerH = Math.max(1, CHART_H - CHART_PAD_Y * 2);
  return bidsChrono.map((bid, i) => {
    const x = n <= 1 ? width / 2 : CHART_PAD_X + (i / (n - 1)) * innerW;
    const yn = (bid.amount - minA) / span;
    const y = CHART_PAD_Y + innerH * (1 - yn);
    return { bid, x, y, index: i };
  });
}

/** Smooth curve through points (Catmull-Rom → cubic Bézier, uniform). */
function buildSmoothCurvePath(pts: { x: number; y: number }[]): string {
  if (pts.length < 2) return "";
  if (pts.length === 2) {
    const a = pts[0]!;
    const b = pts[1]!;
    return `M ${a.x} ${a.y} L ${b.x} ${b.y}`;
  }
  let d = `M ${pts[0]!.x} ${pts[0]!.y}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = i > 0 ? pts[i - 1]! : pts[i]!;
    const p1 = pts[i]!;
    const p2 = pts[i + 1]!;
    const p3 = i + 2 < pts.length ? pts[i + 2]! : pts[i + 1]!;
    const cp1x = p1.x + (p2.x - p0.x) / 6;
    const cp1y = p1.y + (p2.y - p0.y) / 6;
    const cp2x = p2.x - (p3.x - p1.x) / 6;
    const cp2y = p2.y - (p3.y - p1.y) / 6;
    d += ` C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${p2.x} ${p2.y}`;
  }
  return d;
}

/** `bids` newest-first: index i vs next older bid or optional auction start. */
function bidAmountDelta(
  bidIndex: number,
  amount: number,
  bids: BidRow[],
  startingPrice?: number,
): number | null {
  const older = bids[bidIndex + 1];
  const baseline =
    older?.amount ??
    (typeof startingPrice === "number" && Number.isFinite(startingPrice)
      ? startingPrice
      : undefined);
  if (baseline === undefined) return null;
  return amount - baseline;
}

export function BidHistoryCollapsible({ bids, startingPrice }: Props) {
  const [open, setOpen] = useState(false);
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [chartW, setChartW] = useState(0);
  const reducedMotion = useReducedMotion();
  const chevronTurn = useSharedValue(0);

  const isWeb = Platform.OS === "web";

  useEffect(() => {
    if (reducedMotion) {
      chevronTurn.value = open ? 180 : 0;
      return;
    }
    chevronTurn.value = withTiming(open ? 180 : 0, {
      duration: durationPanelOpenMs,
      easing: easingEnter,
    });
  }, [open, reducedMotion, chevronTurn]);

  const chevronStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${chevronTurn.value}deg` }],
  }));

  const panelEntering = reducedMotion
    ? FadeIn.duration(1)
    : FadeInDown.duration(durationPanelOpenMs).easing(easingEnter);
  const panelExiting = reducedMotion
    ? FadeOut.duration(1)
    : FadeOut.duration(durationPanelCloseMs).easing(easingEnter);

  /** Oldest → newest (left → right on chart). */
  const chronological = useMemo(() => [...bids].reverse(), [bids]);

  const points = useMemo(
    () => buildStepLayout(chronological, chartW),
    [chronological, chartW],
  );

  const latestDetail = useMemo(() => bids.slice(0, LATEST_DETAIL), [bids]);

  const onChartLayout = (e: LayoutChangeEvent) => {
    const w = e.nativeEvent.layout.width;
    if (w > 0 && Math.abs(w - chartW) > 0.5) setChartW(w);
  };

  const curvePath = useMemo(() => {
    if (!points || points.length < 2) return "";
    return buildSmoothCurvePath(points.map((p) => ({ x: p.x, y: p.y })));
  }, [points]);

  return (
    <View
      style={{
        borderRadius: radii.xl,
        borderWidth: 1,
        borderColor: colors.hairlineSoft,
        backgroundColor: colors.surfaceSoft,
        overflow: "hidden",
        ...shadows.card,
      }}
    >
      <Pressable
        onPress={() => setOpen((o) => !o)}
        style={{
          flexDirection: "row",
          alignItems: "center",
          padding: space.lg,
          gap: space.md,
          backgroundColor: colors.surfaceSoft,
        }}
      >
        <View
          style={{
            width: 40,
            height: 40,
            borderRadius: radii.md,
            backgroundColor: colors.accentMuted,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Ionicons name="trending-up-outline" size={22} color={colors.primary} />
        </View>
        <View style={{ flex: 1 }}>
          <TextBody style={{ fontWeight: "600", color: colors.text }}>Bid history</TextBody>
          <TextCaption style={{ marginTop: 2, color: colors.textMuted }}>
            {bids.length === 0
              ? "No bids yet"
              : `${bids.length} bid${bids.length === 1 ? "" : "s"} · chart follows price over time`}
          </TextCaption>
        </View>
        <Animated.View style={chevronStyle}>
          <Ionicons name="chevron-down" size={22} color={colors.textMuted} />
        </Animated.View>
      </Pressable>
      {open ? (
        <Animated.View
          entering={panelEntering}
          exiting={panelExiting}
          style={{
            paddingHorizontal: space.lg,
            paddingBottom: space.lg,
            borderTopWidth: 1,
            borderTopColor: colors.hairlineSoft,
            backgroundColor: colors.surfaceSoft,
          }}
        >
          {bids.length === 0 ? (
            <TextCaption>No bids yet.</TextCaption>
          ) : (
            <View style={{ marginTop: space.xs }}>
              <TextCaption style={{ color: colors.textMuted, marginBottom: space.sm }}>
                Older bids on the left, newer on the right. Height reflects bid amount.
              </TextCaption>

              <View
                onLayout={onChartLayout}
                style={{
                  height: CHART_H,
                  position: "relative",
                  marginTop: space.xs,
                  overflow: "visible",
                }}
              >
                {chartW > 0 && curvePath ? (
                  <Svg
                    width={chartW}
                    height={CHART_H}
                    style={{ position: "absolute", left: 0, top: 0 }}
                    pointerEvents="none"
                  >
                    <Path
                      d={curvePath}
                      stroke={colors.primary}
                      strokeWidth={2.25}
                      strokeOpacity={0.88}
                      fill="none"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </Svg>
                ) : null}

                {points?.map((p) => {
                  const name = p.bid.bidder_display ?? "Bidder";
                  const showHoverCard = isWeb && hoveredId === p.bid.id;

                  return (
                    <HoverCell
                      key={p.bid.id}
                      style={{
                        position: "absolute",
                        left: p.x - 22,
                        top: p.y - 22,
                        width: 44,
                        height: 44,
                        alignItems: "center",
                        justifyContent: "center",
                        zIndex: 2,
                      }}
                      onHoverIn={() => setHoveredId(p.bid.id)}
                      onHoverOut={() => setHoveredId(null)}
                    >
                      {showHoverCard ? (
                        <View
                          style={{
                            position: "absolute",
                            bottom: 28,
                            left: -30,
                            width: 100,
                            alignItems: "center",
                            backgroundColor: colors.background,
                            padding: space.sm,
                            borderRadius: radii.md,
                            borderWidth: 1,
                            borderColor: colors.border,
                            ...shadows.card,
                          }}
                        >
                          <BidderAvatar
                            name={name}
                            avatarUrl={p.bid.bidder_avatar_url}
                            size={32}
                          />
                          <View style={{ marginTop: 4 }}>
                            <ValueCurrency amount={p.bid.amount} size="compact" />
                          </View>
                        </View>
                      ) : (
                        <View
                          style={{
                            width: NODE,
                            height: NODE,
                            borderRadius: NODE / 2,
                            backgroundColor: colors.background,
                            borderWidth: 2,
                            borderColor: colors.primary,
                          }}
                        />
                      )}
                    </HoverCell>
                  );
                })}
              </View>

              {isWeb ? (
                <TextCaption style={{ marginTop: space.sm, color: colors.textMuted, textAlign: "center" }}>
                  Hover a point for bidder photo and amount.
                </TextCaption>
              ) : null}

              <TextCaption
                style={{
                  marginTop: space.lg,
                  marginBottom: space.sm,
                  fontWeight: "500",
                  color: colors.textMuted,
                  letterSpacing: 0.6,
                }}
              >
                Latest {Math.min(LATEST_DETAIL, bids.length)} bid
                {bids.length === 1 ? "" : "s"}
              </TextCaption>

              {latestDetail.map((b, rowIdx) => {
                const name = b.bidder_display ?? "Bidder";
                const delta = bidAmountDelta(rowIdx, b.amount, bids, startingPrice);
                return (
                  <View
                    key={`latest-${b.id}`}
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      paddingVertical: space.md,
                      borderTopWidth: 1,
                      borderTopColor: colors.border,
                      gap: space.md,
                    }}
                  >
                    <BidderAvatar name={name} avatarUrl={b.bidder_avatar_url} size={40} />
                    <View style={{ flex: 1, minWidth: 0 }}>
                      <TextBody style={{ fontWeight: "500" }} numberOfLines={1}>
                        {name}
                      </TextBody>
                      <TextCaption style={{ marginTop: 2, color: colors.textMuted }}>
                        {formatRelative(b.created_at)}
                      </TextCaption>
                    </View>
                    <View
                      style={{
                        flexDirection: "row",
                        alignItems: "center",
                        gap: space.sm,
                        flexShrink: 0,
                      }}
                    >
                      <ValueCurrency amount={b.amount} size="compact" />
                      {delta != null && Math.abs(delta) > 1e-6 ? (
                        <TextCaption
                          style={{
                            color: delta < 0 ? colors.danger : colors.textMuted,
                            fontWeight: "500",
                            fontVariant: ["tabular-nums"],
                          }}
                        >
                          {delta >= 0 ? "+" : "-"}
                          {formatMoneyAmount(Math.abs(delta))}
                        </TextCaption>
                      ) : null}
                    </View>
                  </View>
                );
              })}
            </View>
          )}
        </Animated.View>
      ) : null}
    </View>
  );
}
