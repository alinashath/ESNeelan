import { useState } from "react";
import { Pressable, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { colors, fontMono, radii, shadows, space } from "@/src/theme/tokens";
import { TextBody } from "./TextBody";
import { TextCaption } from "./TextCaption";
import { ValueCurrency } from "./ValueCurrency";
import type { BidRow } from "./BidHistoryList";

type Props = { bids: BidRow[] };

function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase();
  return (parts[0]![0]! + parts[1]![0]!).toUpperCase();
}

function formatRelative(iso: string) {
  const sec = Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 1000));
  if (sec < 60) return "just now";
  const m = Math.floor(sec / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  return `${d}d ago`;
}

export function BidHistoryCollapsible({ bids }: Props) {
  const [open, setOpen] = useState(false);
  return (
    <View
      style={{
        borderRadius: radii.lg,
        borderWidth: 1,
        borderColor: colors.border,
        backgroundColor: colors.background,
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
        }}
      >
        <View
          style={{
            width: 40,
            height: 40,
            borderRadius: radii.md,
            backgroundColor: colors.surfaceMuted,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Ionicons name="time-outline" size={22} color={colors.primary} />
        </View>
        <View style={{ flex: 1 }}>
          <TextBody style={{ fontWeight: "600" }}>Bid history</TextBody>
          <TextCaption style={{ marginTop: 2 }}>
            {bids.length} recent {bids.length === 1 ? "action" : "actions"}
          </TextCaption>
        </View>
        <Ionicons
          name={open ? "chevron-up" : "chevron-down"}
          size={22}
          color={colors.textMuted}
        />
      </Pressable>
      {open ? (
        <View style={{ paddingHorizontal: space.lg, paddingBottom: space.lg }}>
          {bids.length === 0 ? (
            <TextCaption>No bids yet.</TextCaption>
          ) : (
            bids.map((b) => {
              const name = b.bidder_display ?? "Bidder";
              return (
                <View
                  key={b.id}
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    paddingVertical: space.md,
                    borderTopWidth: 1,
                    borderTopColor: colors.border,
                    gap: space.md,
                  }}
                >
                  <View
                    style={{
                      width: 40,
                      height: 40,
                      borderRadius: 20,
                      backgroundColor: colors.tertiaryMuted,
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <TextCaption style={{ fontWeight: "600", color: colors.primary }}>
                      {initials(name)}
                    </TextCaption>
                  </View>
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <TextBody style={{ fontWeight: "600" }} numberOfLines={1}>
                      {name}
                    </TextBody>
                    <TextCaption style={{ marginTop: 2 }}>{formatRelative(b.created_at)}</TextCaption>
                  </View>
                  <View style={{ alignItems: "flex-end" }}>
                    <ValueCurrency amount={b.amount} />
                  </View>
                </View>
              );
            })
          )}
        </View>
      ) : null}
    </View>
  );
}
