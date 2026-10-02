import { supabase } from "@/src/lib/supabase";
import { SELLER_COLLECTION_COVERS_BUCKET } from "@/src/lib/seller-collection-cover";

type AdminDeleteAuctionResult = {
  ok?: boolean;
  error?: string;
  storage_paths?: string[] | null;
  payment_proof_path?: string | null;
};

type AdminDeleteCollectionResult = {
  ok?: boolean;
  error?: string;
  cover_storage_path?: string | null;
};

async function removeStoragePaths(bucket: string, paths: string[]) {
  const unique = [...new Set(paths.map((p) => p.trim()).filter(Boolean))];
  if (!unique.length) return;
  const { error } = await supabase.storage.from(bucket).remove(unique);
  if (error) console.warn(`admin storage cleanup (${bucket})`, error.message);
}

/** Hard-delete any listing (any status). Cleans related DB rows + best-effort storage. */
export async function adminDeleteAuction(auctionId: string): Promise<void> {
  const { data, error } = await supabase.rpc("admin_delete_auction", {
    p_auction_id: auctionId,
  });
  if (error) throw error;
  const result = data as AdminDeleteAuctionResult;
  if (!result?.ok) {
    throw new Error(result?.error ?? "Could not delete listing.");
  }

  const imagePaths = Array.isArray(result.storage_paths)
    ? result.storage_paths.filter((p): p is string => typeof p === "string")
    : [];
  await removeStoragePaths("auction-images", imagePaths);

  if (typeof result.payment_proof_path === "string" && result.payment_proof_path.trim()) {
    await removeStoragePaths("payment-proofs", [result.payment_proof_path.trim()]);
  }
}

/** Hard-delete a seller collection (and its items). Best-effort cover cleanup. */
export async function adminDeleteSellerCollection(collectionId: string): Promise<void> {
  const { data, error } = await supabase.rpc("admin_delete_seller_collection", {
    p_collection_id: collectionId,
  });
  if (error) throw error;
  const result = data as AdminDeleteCollectionResult;
  if (!result?.ok) {
    throw new Error(result?.error ?? "Could not delete collection.");
  }

  if (typeof result.cover_storage_path === "string" && result.cover_storage_path.trim()) {
    await removeStoragePaths(SELLER_COLLECTION_COVERS_BUCKET, [result.cover_storage_path.trim()]);
  }
}
