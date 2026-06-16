import { storagePublicUrl } from "@/src/lib/storage-url";

export const SELLER_COLLECTION_COVERS_BUCKET = "seller-collection-covers" as const;

export function sellerCollectionCoverPublicUrl(path: string | null | undefined): string | null {
  if (!path?.trim()) return null;
  return storagePublicUrl(SELLER_COLLECTION_COVERS_BUCKET, path);
}
