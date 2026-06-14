import { supabase } from "@/src/lib/supabase";

export type FeedbackType = "completed_happy" | "not_proceed_terms" | "not_proceed_quality";

export async function submitBuyerFeedback(
  auctionId: string,
  stars: number,
  feedbackType: FeedbackType,
) {
  const { data, error } = await supabase.rpc("buyer_submit_feedback", {
    p_auction_id: auctionId,
    p_stars: stars,
    p_feedback_type: feedbackType,
  });
  if (error) throw error;
  const res = data as { ok?: boolean; error?: string };
  if (!res?.ok) throw new Error(res?.error ?? "Feedback failed");
}
