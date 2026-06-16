import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/src/lib/supabase";
import { parseFeaturedArticleBlocks, type FeaturedArticleBlock } from "@/src/lib/featured-article-blocks";
import { resolveFeaturedArticleCoverDisplayUrl } from "@/src/lib/featured-article-images";

export type FeaturedArticleRow = {
  id: string;
  slug: string;
  title: string;
  excerpt: string;
  /** Uploaded cover (storage path in `featured-article-images`). */
  cover_image_storage_path: string | null;
  /** External cover URL when not using storage. */
  cover_image_url: string | null;
  /** Resolved URL for readers (storage preferred). */
  cover_display_url: string | null;
  blocks: FeaturedArticleBlock[];
  status: "draft" | "published";
  published_at: string | null;
  home_sort_order: number;
  created_by: string;
  created_at: string;
  updated_at: string;
};

export type FeaturedArticleListItem = Pick<
  FeaturedArticleRow,
  | "id"
  | "slug"
  | "title"
  | "excerpt"
  | "cover_display_url"
  | "published_at"
  | "home_sort_order"
  | "status"
>;

/** Hub list row including blocks (for in-page search over body content). */
export type FeaturedArticleHubListItem = FeaturedArticleListItem & {
  blocks: FeaturedArticleBlock[];
};

export type AdminFeaturedArticleListRow = FeaturedArticleListItem & {
  created_at: string;
  updated_at: string;
};

function mapRow(r: Record<string, unknown>): FeaturedArticleRow {
  const storagePath =
    r.cover_image_storage_path == null ? null : String(r.cover_image_storage_path).trim() || null;
  const extUrl = r.cover_image_url == null ? null : String(r.cover_image_url).trim() || null;
  return {
    id: String(r.id),
    slug: String(r.slug),
    title: String(r.title),
    excerpt: String(r.excerpt ?? ""),
    cover_image_storage_path: storagePath,
    cover_image_url: extUrl,
    cover_display_url: resolveFeaturedArticleCoverDisplayUrl(storagePath, extUrl),
    blocks: parseFeaturedArticleBlocks(r.blocks),
    status: r.status === "published" ? "published" : "draft",
    published_at: r.published_at == null ? null : String(r.published_at),
    home_sort_order: Number(r.home_sort_order ?? 0),
    created_by: String(r.created_by),
    created_at: String(r.created_at),
    updated_at: String(r.updated_at),
  };
}

export function usePublishedFeaturedArticlesForHome(options?: { enabled?: boolean }) {
  return useQuery<FeaturedArticleListItem[], Error>({
    queryKey: ["featured-articles", "home"],
    enabled: options?.enabled !== false,
    queryFn: async () => {
      const nowIso = new Date().toISOString();
      const { data, error } = await supabase
        .from("featured_articles")
        .select(
          "id, slug, title, excerpt, cover_image_url, cover_image_storage_path, published_at, home_sort_order, status",
        )
        .eq("status", "published")
        .not("published_at", "is", null)
        .lte("published_at", nowIso)
        .order("home_sort_order", { ascending: true })
        .order("published_at", { ascending: false })
        .limit(12);
      if (error) throw error;
      const rows = (data ?? []) as Record<string, unknown>[];
      return rows.map((raw) => {
        const row = mapRow(raw);
        return {
          id: row.id,
          slug: row.slug,
          title: row.title,
          excerpt: row.excerpt,
          cover_display_url: row.cover_display_url,
          published_at: row.published_at,
          home_sort_order: row.home_sort_order,
          status: row.status,
        } satisfies FeaturedArticleListItem;
      });
    },
  });
}

/** Artists hub: newest first (news-style), more items than home rail; includes blocks for client search. */
export function usePublishedFeaturedArticlesForArtistsHub(options?: { enabled?: boolean }) {
  return useQuery<FeaturedArticleHubListItem[], Error>({
    queryKey: ["featured-articles", "artists-hub"],
    enabled: options?.enabled !== false,
    queryFn: async () => {
      const nowIso = new Date().toISOString();
      const { data, error } = await supabase
        .from("featured_articles")
        .select(
          "id, slug, title, excerpt, cover_image_url, cover_image_storage_path, published_at, home_sort_order, status, blocks",
        )
        .eq("status", "published")
        .not("published_at", "is", null)
        .lte("published_at", nowIso)
        .order("published_at", { ascending: false })
        .limit(60);
      if (error) throw error;
      const rows = (data ?? []) as Record<string, unknown>[];
      return rows.map((raw) => {
        const row = mapRow(raw);
        return {
          id: row.id,
          slug: row.slug,
          title: row.title,
          excerpt: row.excerpt,
          cover_display_url: row.cover_display_url,
          published_at: row.published_at,
          home_sort_order: row.home_sort_order,
          status: row.status,
          blocks: row.blocks,
        } satisfies FeaturedArticleHubListItem;
      });
    },
  });
}

export function useFeaturedArticleBySlug(slug: string | undefined, options?: { enabled?: boolean }) {
  return useQuery<FeaturedArticleRow | null, Error>({
    queryKey: ["featured-article", slug],
    enabled: Boolean(slug) && (options?.enabled !== false),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("featured_articles")
        .select("*")
        .eq("slug", String(slug))
        .maybeSingle();
      if (error) throw error;
      if (!data) return null;
      return mapRow(data as Record<string, unknown>);
    },
  });
}

export function useAdminFeaturedArticlesList(options?: { enabled?: boolean }) {
  return useQuery<AdminFeaturedArticleListRow[], Error>({
    queryKey: ["admin", "featured-articles"],
    enabled: options?.enabled !== false,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("featured_articles")
        .select(
          "id, slug, title, excerpt, cover_image_url, cover_image_storage_path, status, published_at, home_sort_order, created_at, updated_at",
        )
        .order("updated_at", { ascending: false });
      if (error) throw error;
      const rows = (data ?? []) as Record<string, unknown>[];
      return rows.map((raw) => {
        const r = mapRow(raw);
        return {
          id: r.id,
          slug: r.slug,
          title: r.title,
          excerpt: r.excerpt,
          cover_display_url: r.cover_display_url,
          published_at: r.published_at,
          home_sort_order: r.home_sort_order,
          status: r.status,
          created_at: r.created_at,
          updated_at: r.updated_at,
        } satisfies AdminFeaturedArticleListRow;
      });
    },
  });
}

export function useAdminFeaturedArticle(id: string | undefined, options?: { enabled?: boolean }) {
  return useQuery<FeaturedArticleRow | null, Error>({
    queryKey: ["admin", "featured-article", id],
    enabled: Boolean(id) && (options?.enabled !== false),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("featured_articles")
        .select("*")
        .eq("id", String(id))
        .maybeSingle();
      if (error) throw error;
      if (!data) return null;
      return mapRow(data as Record<string, unknown>);
    },
  });
}
