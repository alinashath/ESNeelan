import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  Pressable,
  ScrollView,
  Switch,
  Text,
  TextInput,
  View,
} from "react-native";
import { router, useLocalSearchParams, type Href } from "expo-router";
import { useQueryClient } from "@tanstack/react-query";
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { supabase } from "@/src/lib/supabase";
import {
  emptyBlockForType,
  type FeaturedArticleBlock,
  type FeaturedArticleBlockType,
} from "@/src/lib/featured-article-blocks";
import { Screen } from "@/src/components/ui/Screen";
import { TextTitle } from "@/src/components/ui/TextTitle";
import { TextBody } from "@/src/components/ui/TextBody";
import { TextCaption } from "@/src/components/ui/TextCaption";
import { TextLabel } from "@/src/components/ui/TextLabel";
import { ButtonPrimary } from "@/src/components/ui/ButtonPrimary";
import { ButtonSecondary } from "@/src/components/ui/ButtonSecondary";
import { Chip } from "@/src/components/ui/Chip";
import { ChipRow } from "@/src/components/ui/ChipRow";
import { useAdminFeaturedArticle } from "@/src/data/featured-articles";
import { useAdminAuctionSearchForArticles, useAuctionEmbedById } from "@/src/data/auctions";
import {
  useAdminCollectionSearchForArticles,
  useSellerCollectionDetail,
} from "@/src/data/seller-collections";
import type { ArticleAuctionDisplay } from "@/src/components/ui/FeaturedArticleAuctionEmbed";
import { FeaturedArticlePhotoEditor } from "@/src/components/ui/FeaturedArticlePhotoEditor";
import { useAuth } from "@/src/providers/AuthProvider";
import {
  removeFeaturedArticleImage,
  resolveFeaturedArticleCoverDisplayUrl,
  uploadFeaturedArticleImage,
} from "@/src/lib/featured-article-images";
import { colors, fontFamilies, radii, space } from "@/src/theme/tokens";

const ADD_TYPES: { id: FeaturedArticleBlockType; label: string }[] = [
  { id: "heading", label: "Heading" },
  { id: "paragraph", label: "Paragraph" },
  { id: "quote", label: "Quote" },
  { id: "qa", label: "Q & A" },
  { id: "phone", label: "Phone" },
  { id: "fact_card", label: "Fact card" },
  { id: "photo", label: "Photo" },
  { id: "inline_action", label: "Action" },
  { id: "collection_embed", label: "Collection" },
];

function inputStyle(multiline?: boolean) {
  return {
    marginTop: space.sm,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.md,
    paddingHorizontal: space.md,
    paddingVertical: space.sm,
    color: colors.text,
    minHeight: multiline ? 88 : undefined,
    textAlignVertical: multiline ? "top" : "center",
  } as const;
}

export default function AdminFeaturedArticleEditorScreen() {
  const { profile } = useAuth();
  const { id: rawId } = useLocalSearchParams<{ id: string }>();
  const id = typeof rawId === "string" ? rawId : "";
  const qc = useQueryClient();

  const { data, isLoading, error, refetch } = useAdminFeaturedArticle(id || undefined, {
    enabled: Boolean(id) && profile?.role === "admin",
  });

  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [excerpt, setExcerpt] = useState("");
  const [coverStoragePath, setCoverStoragePath] = useState("");
  const [coverExternalUrl, setCoverExternalUrl] = useState("");
  const [coverBusy, setCoverBusy] = useState(false);
  const [published, setPublished] = useState(false);
  const [publishedAt, setPublishedAt] = useState<string | null>(null);
  const [homeSort, setHomeSort] = useState("0");
  const [blocks, setBlocks] = useState<FeaturedArticleBlock[]>([]);
  const [saving, setSaving] = useState(false);

  const hydratedForId = useRef<string | null>(null);

  useEffect(() => {
    hydratedForId.current = null;
  }, [id]);

  useEffect(() => {
    if (!data || !id) return;
    if (hydratedForId.current === id) return;
    hydratedForId.current = id;
    setTitle(data.title);
    setSlug(data.slug);
    setExcerpt(data.excerpt);
    setCoverStoragePath(data.cover_image_storage_path?.trim() ?? "");
    setCoverExternalUrl(
      data.cover_image_storage_path?.trim() ? "" : (data.cover_image_url ?? ""),
    );
    setPublished(data.status === "published");
    setPublishedAt(data.published_at);
    setHomeSort(String(data.home_sort_order ?? 0));
    setBlocks(data.blocks.map((b) => ({ ...b })));
  }, [data, id]);

  const updateBlock = useCallback((index: number, next: FeaturedArticleBlock) => {
    setBlocks((prev) => {
      const copy = [...prev];
      copy[index] = next;
      return copy;
    });
  }, []);

  const moveBlock = useCallback((index: number, dir: -1 | 1) => {
    setBlocks((prev) => {
      const j = index + dir;
      if (j < 0 || j >= prev.length) return prev;
      const copy = [...prev];
      const t = copy[index];
      copy[index] = copy[j]!;
      copy[j] = t!;
      return copy;
    });
  }, []);

  const removeBlock = useCallback((index: number) => {
    setBlocks((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const addBlock = useCallback((type: FeaturedArticleBlockType) => {
    setBlocks((prev) => [...prev, emptyBlockForType(type)]);
  }, []);

  const coverPreviewUri = useMemo(
    () =>
      resolveFeaturedArticleCoverDisplayUrl(
        coverStoragePath.trim() || null,
        coverExternalUrl.trim() || null,
      ),
    [coverStoragePath, coverExternalUrl],
  );

  async function pickCoverImage() {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert("Photos", "Allow photo library access to upload a cover.");
      return;
    }
    const res = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.82,
    });
    if (res.canceled || !res.assets?.[0]) return;
    const asset = res.assets[0];
    const mime = asset.mimeType ?? "image/jpeg";
    setCoverBusy(true);
    try {
      const prev = coverStoragePath.trim();
      const up = await uploadFeaturedArticleImage(id, asset.uri, mime);
      if ("error" in up) {
        Alert.alert("Upload failed", up.error);
        return;
      }
      if (prev && prev !== up.path) {
        await removeFeaturedArticleImage(prev);
      }
      setCoverStoragePath(up.path);
      setCoverExternalUrl("");
    } finally {
      setCoverBusy(false);
    }
  }

  function clearCoverImage() {
    const hasStorage = Boolean(coverStoragePath.trim());
    const hasUrl = Boolean(coverExternalUrl.trim());
    if (!hasStorage && !hasUrl) return;
    Alert.alert("Remove cover", "Clear the cover image?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Remove",
        style: "destructive",
        onPress: async () => {
          setCoverBusy(true);
          try {
            if (hasStorage) {
              await removeFeaturedArticleImage(coverStoragePath.trim());
            }
            setCoverStoragePath("");
            setCoverExternalUrl("");
          } finally {
            setCoverBusy(false);
          }
        },
      },
    ]);
  }

  const canSave = useMemo(() => {
    return Boolean(id && title.trim() && slug.trim());
  }, [id, title, slug]);

  async function save() {
    if (!id || !canSave) {
      Alert.alert("Missing fields", "Title and slug are required.");
      return;
    }
    const sortN = Math.min(1_000_000, Math.max(0, Math.floor(Number(homeSort) || 0)));
    const nextStatus = published ? "published" : "draft";
    const nextPublishedAt =
      nextStatus === "published" ? (publishedAt ?? new Date().toISOString()) : null;

    setSaving(true);
    try {
      const { error: upErr } = await supabase
        .from("featured_articles")
        .update({
          title: title.trim(),
          slug: slug.trim(),
          excerpt: excerpt.trim(),
          cover_image_storage_path: coverStoragePath.trim() || null,
          cover_image_url: coverStoragePath.trim() ? null : coverExternalUrl.trim() || null,
          blocks,
          status: nextStatus,
          published_at: nextPublishedAt,
          home_sort_order: sortN,
        })
        .eq("id", id);
      if (upErr) {
        Alert.alert("Save failed", upErr.message);
        return;
      }
      setPublishedAt(nextPublishedAt);
      await refetch();
      qc.invalidateQueries({ queryKey: ["admin", "featured-articles"] });
      qc.invalidateQueries({ queryKey: ["featured-articles"] });
      qc.invalidateQueries({ queryKey: ["featured-article", slug.trim()] });
      Alert.alert("Saved", "Article updated.");
    } finally {
      setSaving(false);
    }
  }

  if (profile?.role !== "admin") {
    return (
      <Screen scroll>
        <TextTitle>Edit article</TextTitle>
        <TextBody style={{ marginTop: space.lg }}>Admin only.</TextBody>
      </Screen>
    );
  }

  if (!id) {
    return (
      <Screen scroll>
        <TextBody>Missing article id.</TextBody>
      </Screen>
    );
  }

  if (isLoading) {
    return (
      <Screen scroll>
        <TextCaption>Loading…</TextCaption>
      </Screen>
    );
  }

  if (error || !data) {
    return (
      <Screen scroll>
        <TextBody>Could not load this article.</TextBody>
        <ButtonSecondary title="Back to list" onPress={() => router.replace("/admin/articles" as Href)} />
      </Screen>
    );
  }

  return (
    <Screen scroll={false}>
      <ScrollView
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          paddingHorizontal: space.lg,
          paddingBottom: space.xxl,
        }}
      >
        <TextTitle style={{ marginBottom: space.sm }}>Edit article</TextTitle>
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: space.lg,
          }}
        >
          <TextLabel>PUBLISHED ON HOME</TextLabel>
          <Switch
            value={published}
            onValueChange={(v) => {
              setPublished(v);
              if (v && !publishedAt) setPublishedAt(new Date().toISOString());
            }}
          />
        </View>

        <TextLabel>TITLE</TextLabel>
        <TextInput
          value={title}
          onChangeText={setTitle}
          placeholder="Headline"
          placeholderTextColor={colors.textMuted}
          style={inputStyle()}
        />

        <TextLabel style={{ marginTop: space.lg }}>SLUG (URL)</TextLabel>
        <TextInput
          value={slug}
          onChangeText={(t) => setSlug(t.toLowerCase().replace(/\s+/g, "-"))}
          autoCapitalize="none"
          autoCorrect={false}
          placeholder="my-story"
          placeholderTextColor={colors.textMuted}
          style={inputStyle()}
        />
        <TextCaption style={{ marginTop: 4 }}>Public URL: /article/{slug || "…"}</TextCaption>

        <TextLabel style={{ marginTop: space.lg }}>EXCERPT</TextLabel>
        <TextInput
          value={excerpt}
          onChangeText={setExcerpt}
          placeholder="Short summary for cards"
          placeholderTextColor={colors.textMuted}
          multiline
          style={inputStyle(true)}
        />

        <TextLabel style={{ marginTop: space.lg }}>COVER IMAGE</TextLabel>
        <TextCaption style={{ marginTop: space.xs, marginBottom: space.sm, color: colors.textSecondary }}>
          Upload to store in your project bucket, or paste an external HTTPS URL (used when no upload).
        </TextCaption>
        {coverPreviewUri ? (
          <Image
            source={{ uri: coverPreviewUri }}
            style={{
              width: "100%",
              height: 160,
              borderRadius: radii.md,
              marginTop: space.sm,
              backgroundColor: colors.surfaceMuted,
            }}
            resizeMode="cover"
          />
        ) : null}
        <View style={{ marginTop: space.md, flexDirection: "row", flexWrap: "wrap", gap: space.sm }}>
          <ButtonSecondary
            title={coverBusy ? "Working…" : coverPreviewUri ? "Replace cover upload" : "Upload cover"}
            onPress={() => void pickCoverImage()}
            disabled={coverBusy}
          />
          {coverPreviewUri ? (
            <ButtonSecondary title="Remove cover" onPress={clearCoverImage} disabled={coverBusy} />
          ) : null}
        </View>
        <TextLabel style={{ marginTop: space.lg }}>COVER — EXTERNAL URL (OPTIONAL)</TextLabel>
        <TextInput
          value={coverExternalUrl}
          onChangeText={(t) => {
            setCoverExternalUrl(t);
            if (t.trim()) setCoverStoragePath("");
          }}
          placeholder="https://… (only if not using upload above)"
          placeholderTextColor={colors.textMuted}
          autoCapitalize="none"
          style={inputStyle()}
        />

        <TextLabel style={{ marginTop: space.lg }}>HOME CARD ORDER</TextLabel>
        <TextInput
          value={homeSort}
          onChangeText={setHomeSort}
          keyboardType="number-pad"
          placeholder="0"
          placeholderTextColor={colors.textMuted}
          style={inputStyle()}
        />
        <TextCaption style={{ marginTop: 4 }}>Lower numbers appear first in the carousel.</TextCaption>

        <TextLabel style={{ marginTop: space.xl }}>CONTENT BLOCKS</TextLabel>
        <TextBody style={{ marginTop: space.xs, marginBottom: space.md, color: colors.textSecondary }}>
          Add headings, body copy, quotes, Q&A, photos, a tap-to-call row, fact cards, action blocks
          (link button or embedded auction), and collection modules (gallery preview + link to the full
          collection). Use paths like <Text style={{ fontFamily: fontFamilies.bodySemiBold }}>/auction/…</Text>{" "}
          for in-app links.
        </TextBody>

        {blocks.map((block, index) => (
          <View
            key={`blk-${index}`}
            style={{
              borderWidth: 1,
              borderColor: colors.border,
              borderRadius: radii.lg,
              padding: space.md,
              marginBottom: space.md,
              backgroundColor: colors.background,
            }}
          >
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "space-between",
                marginBottom: space.sm,
              }}
            >
              <TextCaption style={{ fontWeight: "700", color: colors.primary }}>
                {block.type.replaceAll("_", " ").toUpperCase()}
              </TextCaption>
              <View style={{ flexDirection: "row", gap: space.xs }}>
                <Pressable
                  onPress={() => moveBlock(index, -1)}
                  hitSlop={8}
                  accessibilityLabel="Move block up"
                >
                  <Ionicons name="arrow-up" size={20} color={colors.textSecondary} />
                </Pressable>
                <Pressable
                  onPress={() => moveBlock(index, 1)}
                  hitSlop={8}
                  accessibilityLabel="Move block down"
                >
                  <Ionicons name="arrow-down" size={20} color={colors.textSecondary} />
                </Pressable>
                <Pressable
                  onPress={() => removeBlock(index)}
                  hitSlop={8}
                  accessibilityLabel="Remove block"
                >
                  <Ionicons name="trash-outline" size={20} color={colors.danger} />
                </Pressable>
              </View>
            </View>
            <BlockFields articleId={id} block={block} onChange={(b) => updateBlock(index, b)} />
          </View>
        ))}

        <TextLabel style={{ marginTop: space.sm }}>ADD BLOCK</TextLabel>
        <ChipRow>
          {ADD_TYPES.map((t) => (
            <Chip
              key={t.id}
              title={t.label}
              appearance="outlined"
              selected={false}
              onPress={() => addBlock(t.id)}
            />
          ))}
        </ChipRow>

        <View style={{ marginTop: space.xl, gap: space.sm }}>
          <ButtonPrimary title={saving ? "Saving…" : "Save"} loading={saving} disabled={saving || !canSave} onPress={() => void save()} />
          <ButtonSecondary
            title="Preview public page"
            onPress={() => router.push(`/article/${encodeURIComponent(slug.trim())}` as Href)}
          />
        </View>
      </ScrollView>
    </Screen>
  );
}

type InlineActionBlock = Extract<FeaturedArticleBlock, { type: "inline_action" }>;

const DISPLAY_OPTIONS: { id: ArticleAuctionDisplay; label: string }[] = [
  { id: "row", label: "Row" },
  { id: "card", label: "Card" },
  { id: "explore", label: "Explore" },
  { id: "large_card", label: "Large card" },
];

function InlineActionBlockEditor({
  block,
  onChange,
}: {
  block: InlineActionBlock;
  onChange: (b: InlineActionBlock) => void;
}) {
  const { profile } = useAuth();
  const [embedKind, setEmbedKind] = useState<"link" | "auction">(
    block.auction_id?.trim() ? "auction" : "link",
  );
  const [searchInput, setSearchInput] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");

  useEffect(() => {
    setEmbedKind(block.auction_id?.trim() ? "auction" : "link");
  }, [block.auction_id]);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(searchInput.trim()), 400);
    return () => clearTimeout(t);
  }, [searchInput]);

  const canSearch = profile?.role === "admin";
  const { data: hits = [], isFetching } = useAdminAuctionSearchForArticles(debouncedSearch, {
    enabled: canSearch && embedKind === "auction" && debouncedSearch.length >= 2,
  });

  const attachedId = block.auction_id?.trim() ?? "";
  const { data: attachedAuction } = useAuctionEmbedById(attachedId || undefined, {
    enabled: Boolean(attachedId),
  });

  function setLinkMode() {
    setEmbedKind("link");
    onChange({
      ...block,
      auction_id: null,
      auction_display: undefined,
    });
  }

  function setAuctionMode() {
    setEmbedKind("auction");
  }

  function pickAuction(id: string) {
    onChange({
      ...block,
      auction_id: id,
      href: `/auction/${id}`,
      auction_display: block.auction_display ?? "card",
    });
    setSearchInput("");
  }

  function clearAuction() {
    onChange({
      ...block,
      auction_id: null,
      auction_display: undefined,
      href: block.href?.startsWith("/auction/") ? "/(tabs)/explore" : block.href,
    });
  }

  const currentDisplay: ArticleAuctionDisplay = block.auction_display ?? "card";

  return (
    <View>
      <TextLabel>ACTION TYPE</TextLabel>
      <ChipRow>
        <Chip
          title="Button link"
          appearance="outlined"
          selected={embedKind === "link"}
          onPress={() => setLinkMode()}
        />
        <Chip
          title="Auction listing"
          appearance="outlined"
          selected={embedKind === "auction"}
          onPress={() => setAuctionMode()}
        />
      </ChipRow>

      {embedKind === "link" ? (
        <View style={{ marginTop: space.md }}>
          <TextLabel>BUTTON LABEL</TextLabel>
          <TextInput
            value={block.label}
            onChangeText={(label) => onChange({ ...block, label })}
            placeholder="Learn more"
            placeholderTextColor={colors.textMuted}
            style={inputStyle()}
          />
          <TextLabel style={{ marginTop: space.lg }}>HREF (PATH OR HTTPS)</TextLabel>
          <TextInput
            value={block.href}
            onChangeText={(href) => onChange({ ...block, href })}
            autoCapitalize="none"
            placeholder="/(tabs)/explore"
            placeholderTextColor={colors.textMuted}
            style={inputStyle()}
          />
        </View>
      ) : (
        <View style={{ marginTop: space.md }}>
          <TextLabel>OPTIONAL LABEL ABOVE LISTING</TextLabel>
          <TextInput
            value={block.label}
            onChangeText={(label) => onChange({ ...block, label })}
            placeholder="e.g. Staff pick"
            placeholderTextColor={colors.textMuted}
            style={inputStyle()}
          />

          <TextLabel style={{ marginTop: space.lg }}>SEARCH LISTINGS</TextLabel>
          <TextCaption style={{ marginTop: space.xs, marginBottom: space.sm, color: colors.textSecondary }}>
            Type at least 2 characters of the auction title, then tap a result to attach it.
          </TextCaption>
          <TextInput
            value={searchInput}
            onChangeText={setSearchInput}
            autoCorrect={false}
            placeholder="Search by title…"
            placeholderTextColor={colors.textMuted}
            style={inputStyle()}
          />
          {isFetching ? (
            <View style={{ marginTop: space.sm, flexDirection: "row", alignItems: "center", gap: space.sm }}>
              <ActivityIndicator size="small" color={colors.accent} />
              <TextCaption>Searching…</TextCaption>
            </View>
          ) : null}

          {embedKind === "auction" && debouncedSearch.length >= 2 && hits.length ? (
            <ScrollView
              style={{ marginTop: space.sm, maxHeight: 220, borderWidth: 1, borderColor: colors.border, borderRadius: radii.md }}
              keyboardShouldPersistTaps="handled"
              nestedScrollEnabled
            >
              {hits.map((h) => (
                <Pressable
                  key={h.id}
                  onPress={() => pickAuction(h.id)}
                  style={({ pressed }) => ({
                    flexDirection: "row",
                    alignItems: "center",
                    gap: space.sm,
                    padding: space.md,
                    borderBottomWidth: 1,
                    borderBottomColor: colors.border,
                    opacity: pressed ? 0.85 : 1,
                  })}
                >
                  <View
                    style={{
                      width: 44,
                      height: 44,
                      borderRadius: radii.sm,
                      overflow: "hidden",
                      backgroundColor: colors.surfaceMuted,
                    }}
                  >
                    {h.image_url ? (
                      <Image source={{ uri: h.image_url }} style={{ width: "100%", height: "100%" }} />
                    ) : null}
                  </View>
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <TextBody numberOfLines={2} style={{ fontWeight: "600" }}>
                      {h.title}
                    </TextBody>
                    <TextCaption style={{ marginTop: 2, color: colors.textMuted }}>{h.status}</TextCaption>
                  </View>
                  <Ionicons name="add-circle-outline" size={22} color={colors.primary} />
                </Pressable>
              ))}
            </ScrollView>
          ) : embedKind === "auction" && debouncedSearch.length >= 2 && !isFetching ? (
            <TextCaption style={{ marginTop: space.sm, color: colors.textMuted }}>No matches.</TextCaption>
          ) : null}

          {attachedId ? (
            <View style={{ marginTop: space.lg }}>
              <TextLabel>ATTACHED LISTING</TextLabel>
              <View
                style={{
                  marginTop: space.sm,
                  padding: space.md,
                  borderRadius: radii.md,
                  borderWidth: 1,
                  borderColor: colors.border,
                  backgroundColor: colors.surfaceSoft,
                }}
              >
                <TextBody style={{ fontWeight: "600" }} numberOfLines={2}>
                  {attachedAuction?.title ?? attachedId}
                </TextBody>
                <TextCaption style={{ marginTop: 4, color: colors.textMuted }}>{attachedId}</TextCaption>
                <ButtonSecondary title="Clear listing" onPress={clearAuction} style={{ marginTop: space.md, alignSelf: "flex-start" }} />
              </View>
            </View>
          ) : null}

          <TextLabel style={{ marginTop: space.lg }}>HOW IT SHOWS IN THE ARTICLE</TextLabel>
          <ChipRow>
            {DISPLAY_OPTIONS.map((d) => (
              <Chip
                key={d.id}
                title={d.label}
                appearance="outlined"
                selected={currentDisplay === d.id}
                onPress={() => onChange({ ...block, auction_display: d.id })}
              />
            ))}
          </ChipRow>
          <TextCaption style={{ marginTop: space.xs, color: colors.textSecondary }}>
            Row — compact horizontal strip. Card — full-width compact card. Explore — same column width as
            the Explore grid. Large card — taller hero-style card.
          </TextCaption>
        </View>
      )}
    </View>
  );
}

type CollectionEmbedBlock = Extract<FeaturedArticleBlock, { type: "collection_embed" }>;

function CollectionEmbedBlockEditor({
  block,
  onChange,
}: {
  block: CollectionEmbedBlock;
  onChange: (b: CollectionEmbedBlock) => void;
}) {
  const { profile } = useAuth();
  const [searchInput, setSearchInput] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(searchInput.trim()), 400);
    return () => clearTimeout(t);
  }, [searchInput]);

  const canSearch = profile?.role === "admin";
  const { data: hits = [], isFetching } = useAdminCollectionSearchForArticles(debouncedSearch, {
    enabled: canSearch && debouncedSearch.length >= 2,
  });

  const attachedId = block.collection_id?.trim() ?? "";
  const { data: attached } = useSellerCollectionDetail(attachedId || undefined);

  function pickCollection(id: string) {
    onChange({ ...block, collection_id: id });
    setSearchInput("");
  }

  function clearCollection() {
    onChange({ ...block, collection_id: "" });
  }

  return (
    <View>
      <TextLabel>OPTIONAL LABEL ABOVE MODULE</TextLabel>
      <TextInput
        value={block.label ?? ""}
        onChangeText={(label) => onChange({ ...block, label })}
        placeholder="e.g. Curated picks"
        placeholderTextColor={colors.textMuted}
        style={inputStyle()}
      />

      <TextLabel style={{ marginTop: space.lg }}>COLLECTION ID (OPTIONAL)</TextLabel>
      <TextCaption style={{ marginTop: space.xs, marginBottom: space.sm, color: colors.textSecondary }}>
        Paste a collection UUID if you already have it, or search by name below.
      </TextCaption>
      <TextInput
        value={block.collection_id}
        onChangeText={(collection_id) => onChange({ ...block, collection_id })}
        autoCapitalize="none"
        autoCorrect={false}
        placeholder="uuid…"
        placeholderTextColor={colors.textMuted}
        style={inputStyle()}
      />

      <TextLabel style={{ marginTop: space.lg }}>SEARCH COLLECTIONS BY NAME</TextLabel>
      <TextCaption style={{ marginTop: space.xs, marginBottom: space.sm, color: colors.textSecondary }}>
        Type at least 2 characters, then tap a result to attach it.
      </TextCaption>
      <TextInput
        value={searchInput}
        onChangeText={setSearchInput}
        autoCorrect={false}
        placeholder="Search by collection name…"
        placeholderTextColor={colors.textMuted}
        style={inputStyle()}
      />
      {isFetching ? (
        <View style={{ marginTop: space.sm, flexDirection: "row", alignItems: "center", gap: space.sm }}>
          <ActivityIndicator size="small" color={colors.accent} />
          <TextCaption>Searching…</TextCaption>
        </View>
      ) : null}

      {debouncedSearch.length >= 2 && hits.length ? (
        <ScrollView
          style={{ marginTop: space.sm, maxHeight: 220, borderWidth: 1, borderColor: colors.border, borderRadius: radii.md }}
          keyboardShouldPersistTaps="handled"
          nestedScrollEnabled
        >
          {hits.map((h) => (
            <Pressable
              key={h.id}
              onPress={() => pickCollection(h.id)}
              style={({ pressed }) => ({
                flexDirection: "row",
                alignItems: "center",
                gap: space.sm,
                padding: space.md,
                borderBottomWidth: 1,
                borderBottomColor: colors.border,
                opacity: pressed ? 0.85 : 1,
              })}
            >
              <View
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: radii.sm,
                  overflow: "hidden",
                  backgroundColor: colors.surfaceMuted,
                }}
              >
                {h.cover_url ? (
                  <Image source={{ uri: h.cover_url }} style={{ width: "100%", height: "100%" }} />
                ) : null}
              </View>
              <View style={{ flex: 1, minWidth: 0 }}>
                <TextBody numberOfLines={2} style={{ fontWeight: "600" }}>
                  {h.name}
                </TextBody>
                <TextCaption style={{ marginTop: 2, color: colors.textMuted }} numberOfLines={1}>
                  {h.id}
                </TextCaption>
              </View>
              <Ionicons name="add-circle-outline" size={22} color={colors.primary} />
            </Pressable>
          ))}
        </ScrollView>
      ) : debouncedSearch.length >= 2 && !isFetching ? (
        <TextCaption style={{ marginTop: space.sm, color: colors.textMuted }}>No matches.</TextCaption>
      ) : null}

      {attachedId ? (
        <View style={{ marginTop: space.lg }}>
          <TextLabel>ATTACHED COLLECTION</TextLabel>
          <View
            style={{
              marginTop: space.sm,
              padding: space.md,
              borderRadius: radii.md,
              borderWidth: 1,
              borderColor: colors.border,
              backgroundColor: colors.surfaceSoft,
            }}
          >
            <TextBody style={{ fontWeight: "600" }} numberOfLines={2}>
              {attached?.name ?? attachedId}
            </TextBody>
            <TextCaption style={{ marginTop: 4, color: colors.textMuted }}>{attachedId}</TextCaption>
            {attached?.items?.length != null ? (
              <TextCaption style={{ marginTop: space.xs, color: colors.textSecondary }}>
                {attached.items.length} listing{attached.items.length === 1 ? "" : "s"}
              </TextCaption>
            ) : null}
            <ButtonSecondary title="Clear collection" onPress={clearCollection} style={{ marginTop: space.md, alignSelf: "flex-start" }} />
          </View>
        </View>
      ) : null}
    </View>
  );
}

function BlockFields({
  articleId,
  block,
  onChange,
}: {
  articleId: string;
  block: FeaturedArticleBlock;
  onChange: (b: FeaturedArticleBlock) => void;
}) {
  switch (block.type) {
    case "heading":
      return (
        <View>
          <TextLabel>TEXT</TextLabel>
          <TextInput
            value={block.text}
            onChangeText={(text) => onChange({ ...block, text })}
            placeholder="Section title"
            placeholderTextColor={colors.textMuted}
            style={inputStyle()}
          />
          <TextLabel style={{ marginTop: space.md }}>LEVEL (1–3)</TextLabel>
          <TextInput
            value={String(block.level ?? 2)}
            onChangeText={(t) => {
              const n = Number(t);
              const level = n === 1 || n === 2 || n === 3 ? n : 2;
              onChange({ ...block, level });
            }}
            keyboardType="number-pad"
            style={inputStyle()}
          />
        </View>
      );
    case "paragraph":
      return (
        <View>
          <TextLabel>BODY</TextLabel>
          <TextInput
            value={block.text}
            onChangeText={(text) => onChange({ ...block, text })}
            multiline
            placeholder="Paragraph text"
            placeholderTextColor={colors.textMuted}
            style={inputStyle(true)}
          />
        </View>
      );
    case "quote":
      return (
        <View>
          <TextLabel>QUOTE</TextLabel>
          <TextInput
            value={block.text}
            onChangeText={(text) => onChange({ ...block, text })}
            multiline
            style={inputStyle(true)}
          />
          <TextLabel style={{ marginTop: space.md }}>ATTRIBUTION (OPTIONAL)</TextLabel>
          <TextInput
            value={block.attribution ?? ""}
            onChangeText={(attribution) => onChange({ ...block, attribution })}
            style={inputStyle()}
          />
        </View>
      );
    case "qa":
      return (
        <View>
          <TextLabel>QUESTION</TextLabel>
          <TextInput
            value={block.question}
            onChangeText={(question) => onChange({ ...block, question })}
            style={inputStyle()}
          />
          <TextLabel style={{ marginTop: space.md }}>ANSWER</TextLabel>
          <TextInput
            value={block.answer}
            onChangeText={(answer) => onChange({ ...block, answer })}
            multiline
            style={inputStyle(true)}
          />
        </View>
      );
    case "phone":
      return (
        <View>
          <TextLabel>LABEL (OPTIONAL)</TextLabel>
          <TextInput
            value={block.label ?? ""}
            onChangeText={(label) => onChange({ ...block, label })}
            placeholder="Customer support"
            placeholderTextColor={colors.textMuted}
            style={inputStyle()}
          />
          <TextLabel style={{ marginTop: space.md }}>PHONE NUMBER</TextLabel>
          <TextInput
            value={block.number}
            onChangeText={(number) => onChange({ ...block, number })}
            keyboardType="phone-pad"
            placeholder="+1 …"
            placeholderTextColor={colors.textMuted}
            style={inputStyle()}
          />
        </View>
      );
    case "fact_card":
      return (
        <View>
          <TextLabel>CARD TITLE</TextLabel>
          <TextInput
            value={block.title}
            onChangeText={(t) => onChange({ ...block, title: t })}
            style={inputStyle()}
          />
          <TextLabel style={{ marginTop: space.md }}>FACT LINES</TextLabel>
          {block.facts.map((line, i) => (
            <View key={`fact-${i}`} style={{ marginTop: space.sm, flexDirection: "row", gap: space.sm }}>
              <TextInput
                value={line}
                onChangeText={(t) => {
                  const facts = [...block.facts];
                  facts[i] = t;
                  onChange({ ...block, facts });
                }}
                placeholder={`Fact ${i + 1}`}
                placeholderTextColor={colors.textMuted}
                style={{ ...inputStyle(), flex: 1 }}
              />
              <Pressable
                onPress={() => {
                  const facts = block.facts.filter((_, j) => j !== i);
                  onChange({ ...block, facts: facts.length ? facts : [""] });
                }}
                style={{ justifyContent: "center" }}
              >
                <Ionicons name="close-circle" size={22} color={colors.textMuted} />
              </Pressable>
            </View>
          ))}
          <ButtonSecondary
            title="Add fact line"
            onPress={() => onChange({ ...block, facts: [...block.facts, ""] })}
            style={{ marginTop: space.sm, alignSelf: "flex-start" }}
          />
        </View>
      );
    case "photo":
      return <FeaturedArticlePhotoEditor articleId={articleId} block={block} onChange={onChange} />;
    case "inline_action":
      return <InlineActionBlockEditor block={block} onChange={onChange} />;
    case "collection_embed":
      return <CollectionEmbedBlockEditor block={block} onChange={onChange} />;
    default:
      return null;
  }
}
