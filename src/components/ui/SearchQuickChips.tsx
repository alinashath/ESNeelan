import { Pressable, ScrollView, View } from "react-native";
import { colors, radii, space } from "@/src/theme/tokens";
import { TextCaption } from "./TextCaption";

type Props = {
  /** Short labels users can tap to fill search (discovery — never a “blank” search). */
  suggestions: string[];
  onPick: (term: string) => void;
};

/**
 * Horizontal quick picks under search — supports the mobile UI skill pattern
 * of surfacing popular/trending options instead of an empty search affordance.
 */
export function SearchQuickChips({ suggestions, onPick }: Props) {
  if (!suggestions.length) return null;
  return (
    <View style={{ marginTop: space.md }}>
      <TextCaption style={{ fontWeight: "600", letterSpacing: 0.8, marginBottom: space.sm, color: colors.textMuted }}>
        TRY SEARCHING
      </TextCaption>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        <View style={{ flexDirection: "row", gap: space.sm, paddingRight: space.lg }}>
          {suggestions.map((term) => (
            <Pressable
              key={term}
              onPress={() => onPick(term)}
              accessibilityRole="button"
              accessibilityLabel={`Search for ${term}`}
              style={({ pressed }) => ({
                paddingVertical: space.sm,
                paddingHorizontal: space.md,
                borderRadius: radii.pill,
                backgroundColor: pressed ? colors.accentTint : colors.background,
                borderWidth: 1,
                borderColor: colors.border,
              })}
            >
              <TextCaption style={{ fontWeight: "600", color: colors.text }}>{term}</TextCaption>
            </Pressable>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}
