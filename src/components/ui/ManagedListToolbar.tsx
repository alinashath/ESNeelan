import type { ReactNode } from "react";
import { View } from "react-native";
import { SearchField } from "@/src/components/ui/SearchField";
import { Chip } from "@/src/components/ui/Chip";
import { ChipRow } from "@/src/components/ui/ChipRow";
import { TextLabel } from "@/src/components/ui/TextLabel";
import { space } from "@/src/theme/tokens";

export type ManagedSortOption = { id: string; label: string };

type Props = {
  search: string;
  onSearchChange: (q: string) => void;
  searchPlaceholder?: string;
  sortOptions: ManagedSortOption[];
  sortId: string;
  onSortChange: (id: string) => void;
  filterSlot?: ReactNode;
};

export function ManagedListToolbar({
  search,
  onSearchChange,
  searchPlaceholder = "Search…",
  sortOptions,
  sortId,
  onSortChange,
  filterSlot,
}: Props) {
  return (
    <View style={{ gap: space.md, marginBottom: space.md }}>
      <SearchField
        placeholder={searchPlaceholder}
        value={search}
        onChangeText={onSearchChange}
        autoCorrect={false}
        autoCapitalize="none"
      />
      {filterSlot}
      <View>
        <TextLabel style={{ marginBottom: space.sm }}>SORT</TextLabel>
        <ChipRow>
          {sortOptions.map((o) => (
            <Chip
              key={o.id}
              title={o.label}
              appearance="outlined"
              selected={sortId === o.id}
              onPress={() => onSortChange(o.id)}
            />
          ))}
        </ChipRow>
      </View>
    </View>
  );
}
