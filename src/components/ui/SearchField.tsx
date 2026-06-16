import { Ionicons } from "@expo/vector-icons";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  FlatList,
  Keyboard,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
  type ListRenderItem,
  type TextInputProps,
} from "react-native";
import { filterHomeSearchAutocompleteRows } from "@/src/lib/home-search-suggestions";
import { colors, radii, space } from "@/src/theme/tokens";

const MIN_H = 48;
const DROPDOWN_MAX_H = 280;
const DEFAULT_AUTOCOMPLETE_LIMIT = 8;

type Props = TextInputProps & {
  /** When set, typing shows a dropdown of matching phrases (and idle picks when enabled). */
  suggestions?: readonly string[];
  autocompleteLimit?: number;
  /**
   * When true (default), focusing the field with an empty query shows the first
   * `autocompleteLimit` entries from `suggestions`.
   */
  showIdleSuggestions?: boolean;
};

export function SearchField({
  style,
  value,
  onChangeText,
  placeholder,
  accessibilityLabel,
  suggestions,
  autocompleteLimit = DEFAULT_AUTOCOMPLETE_LIMIT,
  showIdleSuggestions = true,
  onFocus,
  onBlur,
  ...rest
}: Props) {
  const inputRef = useRef<TextInput>(null);
  const blurCloseTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [focused, setFocused] = useState(false);
  const showClear = typeof value === "string" && value.length > 0 && typeof onChangeText === "function";
  const inputA11y =
    accessibilityLabel ??
    (typeof placeholder === "string" && placeholder.length > 0
      ? `Search field, ${placeholder}`
      : "Search");

  const hasSuggestions = suggestions != null && suggestions.length > 0;

  const rows = useMemo(() => {
    if (!hasSuggestions || !suggestions) return [];
    const raw = (value ?? "").trim();
    if (!raw) {
      if (!showIdleSuggestions) return [];
      return Array.from(new Set(suggestions)).slice(0, autocompleteLimit);
    }
    return filterHomeSearchAutocompleteRows(suggestions, raw, autocompleteLimit);
  }, [autocompleteLimit, hasSuggestions, showIdleSuggestions, suggestions, value]);

  const menuOpen = focused && hasSuggestions && rows.length > 0;

  useEffect(() => {
    return () => {
      if (blurCloseTimer.current) clearTimeout(blurCloseTimer.current);
    };
  }, []);

  const pick = (term: string) => {
    if (blurCloseTimer.current) {
      clearTimeout(blurCloseTimer.current);
      blurCloseTimer.current = null;
    }
    onChangeText?.(term);
    setFocused(false);
    Keyboard.dismiss();
    inputRef.current?.blur();
  };

  const renderItem: ListRenderItem<string> = ({ item }) => (
    <Pressable
      onPressIn={() => pick(item)}
      accessibilityRole="button"
      accessibilityLabel={`Use suggestion ${item}`}
      android_ripple={{ color: colors.accentTint }}
      style={({ pressed }) => ({
        paddingVertical: 14,
        paddingHorizontal: space.lg,
        backgroundColor: pressed ? colors.tertiaryMuted : "transparent",
      })}
    >
      <Text
        style={{
          fontSize: 16,
          lineHeight: 22,
          color: colors.text,
        }}
        numberOfLines={2}
      >
        {item}
      </Text>
    </Pressable>
  );

  const dropdown = menuOpen ? (
    <View
      style={{
        position: "absolute",
        left: 0,
        right: 0,
        top: "100%",
        marginTop: 6,
        maxHeight: DROPDOWN_MAX_H,
        borderRadius: radii.md,
        backgroundColor: colors.white,
        borderWidth: StyleSheet.hairlineWidth,
        borderColor: colors.border,
        zIndex: Platform.OS === "web" ? 2000 : 20,
        elevation: Platform.OS === "android" ? 10 : 0,
        ...Platform.select({
          ios: {
            shadowColor: "#000000",
            shadowOffset: { width: 0, height: 6 },
            shadowOpacity: 0.12,
            shadowRadius: 14,
          },
          default: {},
        }),
        overflow: "hidden",
      }}
      accessibilityRole="list"
    >
      <FlatList
        data={rows}
        keyExtractor={(item, index) => `${item}-${index}`}
        renderItem={renderItem}
        keyboardShouldPersistTaps="handled"
        nestedScrollEnabled
        style={{ maxHeight: DROPDOWN_MAX_H }}
      />
    </View>
  ) : null;

  return (
    <View style={{ position: "relative", zIndex: menuOpen ? 50 : 0, overflow: "visible" }}>
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          borderRadius: radii.pill,
          backgroundColor: colors.searchBarFill,
          borderWidth: 0,
          paddingHorizontal: space.lg,
          minHeight: MIN_H,
        }}
        accessibilityRole="search"
      >
        <Ionicons name="search" size={20} color={colors.textMuted} />
        <TextInput
          ref={inputRef}
          placeholder={placeholder}
          placeholderTextColor={colors.textMuted}
          value={value}
          onChangeText={onChangeText}
          returnKeyType="search"
          autoCorrect={false}
          autoCapitalize="none"
          clearButtonMode="never"
          accessibilityLabel={inputA11y}
          onFocus={(e) => {
            if (blurCloseTimer.current) {
              clearTimeout(blurCloseTimer.current);
              blurCloseTimer.current = null;
            }
            setFocused(true);
            onFocus?.(e);
          }}
          onBlur={(e) => {
            blurCloseTimer.current = setTimeout(() => {
              blurCloseTimer.current = null;
              setFocused(false);
            }, 180);
            onBlur?.(e);
          }}
          style={[
            {
              flex: 1,
              marginLeft: space.sm,
              paddingVertical: space.sm,
              fontSize: 16,
              lineHeight: 22,
              color: colors.text,
              minHeight: MIN_H - 4,
            },
            style,
          ]}
          {...rest}
        />
        {showClear ? (
          <Pressable
            onPress={() => onChangeText?.("")}
            hitSlop={12}
            accessibilityRole="button"
            accessibilityLabel="Clear search"
            style={({ pressed }) => ({ opacity: pressed ? 0.55 : 1, padding: 4 })}
          >
            <Ionicons name="close-circle" size={22} color={colors.textMuted} />
          </Pressable>
        ) : null}
      </View>
      {dropdown}
    </View>
  );
}
