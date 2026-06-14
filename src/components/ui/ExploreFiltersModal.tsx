import { Modal, Pressable, ScrollView, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import type {
  ExploreHasBidsFilter,
  ExploreListingScope,
} from "@/src/data/auctions";
import type { CategoryRow } from "@/src/data/category-utils";
import { SearchField } from "@/src/components/ui/SearchField";
import { Chip } from "@/src/components/ui/Chip";
import { ChipRow } from "@/src/components/ui/ChipRow";
import { TextTitle } from "@/src/components/ui/TextTitle";
import { TextSectionTitle } from "@/src/components/ui/TextSectionTitle";
import { TextCaption } from "@/src/components/ui/TextCaption";
import { ButtonPrimary } from "@/src/components/ui/ButtonPrimary";
import { ButtonSecondary } from "@/src/components/ui/ButtonSecondary";
import { colors, space } from "@/src/theme/tokens";

export type ExploreFilterDraft = {
  search: string;
  categoryId: string | null;
  listingScope: ExploreListingScope;
  hasBids: ExploreHasBidsFilter;
};

const DEFAULT_DRAFT: ExploreFilterDraft = {
  search: "",
  categoryId: null,
  listingScope: "all",
  hasBids: "any",
};

type Props = {
  visible: boolean;
  onClose: () => void;
  draft: ExploreFilterDraft;
  onChangeDraft: (next: ExploreFilterDraft) => void;
  onApply: () => void;
  onClear: () => void;
  roots: CategoryRow[];
};

export function ExploreFiltersModal({
  visible,
  onClose,
  draft,
  onChangeDraft,
  onApply,
  onClear,
  roots,
}: Props) {
  const insets = useSafeAreaInsets();

  const set = (patch: Partial<ExploreFilterDraft>) => {
    onChangeDraft({ ...draft, ...patch });
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={{ flex: 1, backgroundColor: colors.background }}>
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
            paddingHorizontal: space.lg,
            paddingTop: space.lg,
            paddingBottom: space.md,
            borderBottomWidth: 1,
            borderBottomColor: colors.border,
          }}
        >
          <TextTitle style={{ fontSize: 20 }}>Filters</TextTitle>
          <Pressable
            onPress={onClose}
            hitSlop={14}
            accessibilityRole="button"
            accessibilityLabel="Close filters"
          >
            <Ionicons name="close" size={28} color={colors.primary} />
          </Pressable>
        </View>

        <ScrollView
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{
            padding: space.lg,
            paddingBottom: space.xxxl + insets.bottom,
          }}
        >
          <TextSectionTitle style={{ marginBottom: space.sm }}>Search</TextSectionTitle>
          <SearchField
            placeholder="Search by title…"
            value={draft.search}
            onChangeText={(t) => set({ search: t })}
            accessibilityLabel="Filter catalog by title"
          />

          <TextSectionTitle style={{ marginTop: space.xxl, marginBottom: space.sm }}>
            Category
          </TextSectionTitle>
          <TextCaption style={{ marginBottom: space.md, color: colors.textMuted }}>
            Curated roots with live listings, plus All.
          </TextCaption>
          <ChipRow>
            <Chip
              title="All"
              selected={draft.categoryId === null}
              onPress={() => set({ categoryId: null })}
            />
            {roots.map((c) => (
              <Chip
                key={c.id}
                title={c.name}
                selected={draft.categoryId === c.id}
                onPress={() => set({ categoryId: c.id })}
              />
            ))}
          </ChipRow>

          <TextSectionTitle style={{ marginTop: space.xxl, marginBottom: space.sm }}>
            Listing status
          </TextSectionTitle>
          <TextCaption style={{ marginBottom: space.md, color: colors.textMuted }}>
            Live auctions are listed first when you show more than one status.
          </TextCaption>
          <ChipRow>
            <Chip
              title="Live & ended"
              selected={draft.listingScope === "all"}
              onPress={() => set({ listingScope: "all" })}
            />
            <Chip
              title="Live only"
              selected={draft.listingScope === "active"}
              onPress={() => set({ listingScope: "active" })}
            />
            <Chip
              title="Ended only"
              selected={draft.listingScope === "ended"}
              onPress={() => set({ listingScope: "ended" })}
            />
          </ChipRow>

          <TextSectionTitle style={{ marginTop: space.xxl, marginBottom: space.sm }}>
            Bidding activity
          </TextSectionTitle>
          <ChipRow>
            <Chip
              title="Any"
              selected={draft.hasBids === "any"}
              onPress={() => set({ hasBids: "any" })}
            />
            <Chip
              title="With bids"
              selected={draft.hasBids === "with"}
              onPress={() => set({ hasBids: "with" })}
            />
            <Chip
              title="No bids yet"
              selected={draft.hasBids === "without"}
              onPress={() => set({ hasBids: "without" })}
            />
          </ChipRow>
        </ScrollView>

        <View
          style={{
            flexDirection: "row",
            gap: space.md,
            padding: space.lg,
            paddingBottom: Math.max(space.lg, insets.bottom + space.md),
            borderTopWidth: 1,
            borderTopColor: colors.border,
            backgroundColor: colors.background,
          }}
        >
          <View style={{ flex: 1 }}>
            <ButtonSecondary title="Clear" onPress={() => onClear()} />
          </View>
          <View style={{ flex: 1 }}>
            <ButtonPrimary title="Apply" onPress={onApply} />
          </View>
        </View>
      </View>
    </Modal>
  );
}

export const exploreFiltersDefault = DEFAULT_DRAFT;
