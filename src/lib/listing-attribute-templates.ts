import type { CategoryRow } from "@/src/data/category-utils";

/** Stored on `auctions.listing_attributes` (JSON). Only populated keys are shown. */
export type ListingAttributesV1 = {
  widthCm?: number | null;
  heightCm?: number | null;
  depthCm?: number | null;
  weightKg?: number | null;
  /** Apparel / one-size style */
  sizeLabel?: string | null;
  /** Lowercase tag strings; may include presets or custom */
  colorTags?: string[];
  materialTags?: string[];
};

export const COLOR_PRESET_TAGS = [
  "black",
  "white",
  "blue",
  "red",
  "green",
  "yellow",
  "brown",
  "gray",
  "silver",
  "gold",
  "multicolor",
] as const;

export const APPAREL_SIZE_TAGS = ["XS", "S", "M", "L", "XL", "XXL", "One size"] as const;

export const MATERIAL_PRESET_TAGS = [
  "canvas",
  "paper",
  "wood",
  "metal",
  "glass",
  "plastic",
  "fabric",
  "leather",
  "ceramic",
  "acrylic paint",
  "oil",
  "watercolor",
  "mixed media",
] as const;

export type ListingFieldTemplate = {
  showDimensions: boolean;
  /** e.g. painting: width × height only */
  dimensionsDepth: boolean;
  showApparelSize: boolean;
  showWeight: boolean;
  showColorTags: boolean;
  showMaterialTags: boolean;
};

function slugSetForSelection(categories: CategoryRow[], selectedIds: string[]): Set<string> {
  const byId = new Map(categories.map((c) => [c.id, c]));
  const slugs = new Set<string>();
  for (const id of selectedIds) {
    let cur = byId.get(id);
    const guard = new Set<string>();
    while (cur && !guard.has(cur.id)) {
      guard.add(cur.id);
      slugs.add(cur.slug);
      cur = cur.parent_id ? byId.get(cur.parent_id) : undefined;
    }
  }
  return slugs;
}

function slugMatches(slugs: Set<string>, predicate: (s: string) => boolean): boolean {
  for (const s of slugs) {
    if (predicate(s)) return true;
  }
  return false;
}

/**
 * Union of field groups implied by all selected categories (slugs + parents).
 */
export function resolveListingFieldTemplate(
  categories: CategoryRow[],
  selectedCategoryIds: string[],
): ListingFieldTemplate {
  if (selectedCategoryIds.length === 0) {
    return {
      showDimensions: false,
      dimensionsDepth: false,
      showApparelSize: false,
      showWeight: false,
      showColorTags: true,
      showMaterialTags: false,
    };
  }
  const slugs = slugSetForSelection(categories, selectedCategoryIds);

  const painting =
    slugs.has("ec-art-paint") || slugMatches(slugs, (s) => s.startsWith("ec-art-paint"));
  const fashion = slugMatches(slugs, (s) => s === "ec-fashion" || s.startsWith("ec-fashion-"));
  const furniture = slugs.has("ec-home-furniture");
  const artTree = slugMatches(slugs, (s) => s === "ec-art" || s.startsWith("ec-art-"));
  const homeTree = slugMatches(slugs, (s) => s === "ec-home" || s.startsWith("ec-home-"));
  const electronics = slugMatches(
    slugs,
    (s) => s === "ec-electronics" || s.startsWith("ec-electronics-"),
  );
  const sports = slugMatches(slugs, (s) => s === "ec-sports" || s.startsWith("ec-sports-"));

  const showDimensions = painting || furniture || artTree || homeTree;
  const dimensionsDepth = furniture && !painting;

  return {
    showDimensions,
    dimensionsDepth,
    showApparelSize: fashion,
    showWeight: electronics || sports,
    showColorTags: true,
    showMaterialTags: artTree || homeTree,
  };
}

export function pruneListingAttributes(
  raw: ListingAttributesV1,
  tpl: ListingFieldTemplate,
): ListingAttributesV1 {
  const out: ListingAttributesV1 = {
    colorTags: raw.colorTags?.length ? [...raw.colorTags] : undefined,
  };
  if (tpl.showDimensions) {
    out.widthCm = raw.widthCm ?? null;
    out.heightCm = raw.heightCm ?? null;
    if (tpl.dimensionsDepth) out.depthCm = raw.depthCm ?? null;
  }
  if (tpl.showApparelSize) out.sizeLabel = raw.sizeLabel ?? null;
  if (tpl.showWeight) out.weightKg = raw.weightKg ?? null;
  if (tpl.showMaterialTags) {
    out.materialTags = raw.materialTags?.length ? [...raw.materialTags] : undefined;
  }
  return out;
}

export function formatDimensionCm(n: number | null | undefined): string {
  if (n == null || !Number.isFinite(n)) return "";
  return `${n} cm`;
}

function normalizeTagKey(s: string): string {
  return s
    .trim()
    .toLowerCase()
    .replace(/_/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function titleCaseWords(s: string): string {
  return s
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(" ");
}

/** Display string for a stored colour tag (presets + free text, not raw DB tokens). */
export function formatColorTagForDisplay(tag: string): string {
  const key = normalizeTagKey(tag);
  const preset = COLOR_PRESET_TAGS.find((c) => normalizeTagKey(String(c)) === key);
  if (preset) {
    const p = String(preset);
    return p.charAt(0).toUpperCase() + p.slice(1).toLowerCase();
  }
  return titleCaseWords(tag.replace(/_/g, " "));
}

/** Display string for a stored material / medium tag (presets + free text). */
export function formatMaterialTagForDisplay(tag: string): string {
  const key = normalizeTagKey(tag);
  const preset = MATERIAL_PRESET_TAGS.find((m) => normalizeTagKey(m) === key);
  if (preset) return preset;
  return titleCaseWords(tag.replace(/_/g, " "));
}

function numOrNull(v: unknown): number | null {
  if (v == null || v === "") return null;
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? n : null;
}

function strArr(v: unknown): string[] | undefined {
  if (!Array.isArray(v)) return undefined;
  const out = v.filter((x): x is string => typeof x === "string" && x.trim().length > 0);
  return out.length ? out.map((s) => s.trim().toLowerCase()) : undefined;
}

export function parseListingAttributesJson(raw: unknown): ListingAttributesV1 {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return {};
  const o = raw as Record<string, unknown>;
  const sizeRaw = o.sizeLabel;
  const sizeLabel =
    typeof sizeRaw === "string" && sizeRaw.trim() ? sizeRaw.trim() : null;
  return {
    widthCm: numOrNull(o.widthCm),
    heightCm: numOrNull(o.heightCm),
    depthCm: numOrNull(o.depthCm),
    weightKg: numOrNull(o.weightKg),
    sizeLabel,
    colorTags: strArr(o.colorTags),
    materialTags: strArr(o.materialTags),
  };
}
