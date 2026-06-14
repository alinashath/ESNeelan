/** Human-facing lines derived from `notification_outbox.payload` + `type`. */

import {
  formatMaldivesPhoneDisplay,
  sellerHighBidderPendingConsentParagraphs,
  sellerListingLiveParagraphs,
  sellerPaymentStageParagraphs,
  winnerConsentRequestedParagraphs,
} from "@/src/lib/bidmaster-legal-copy";

export function notificationTypeTitle(type: string): string {
  switch (type) {
    case "listing_approved_with_codes":
      return "Your listing is live";
    case "winner_consent_requested":
      return "You won an auction";
    case "winner_consented":
      return "Payment stage — contact winner";
    case "auction_pending_winner_consent":
      return "Bidding closed — awaiting winner consent";
    case "please_leave_feedback":
      return "Leave feedback";
    case "payment_proof_received":
      return "Payment proof received";
    case "listing_approved":
      return "Listing approved";
    case "listing_rejected":
      return "Listing rejected";
    case "featured_listing_fee_verified":
      return "Featured listing fee verified";
    case "featured_fee_request_rejected":
      return "Featured fee request declined";
    case "bid_placed":
      return "Bid placed";
    case "outbid":
      return "You were outbid";
    case "auction_ended":
      return "Auction ended";
    case "auction_winner":
      return "Your auction has a winner";
    case "marked_paid":
      return "Payment marked received";
    case "won_auction":
      return "You won";
    default:
      return type.replace(/_/g, " ");
  }
}

function str(v: unknown): string | null {
  if (typeof v === "string" && v.trim()) return v.trim();
  return null;
}

function num(v: unknown): number | null {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string" && v.trim() !== "" && Number.isFinite(Number(v))) return Number(v);
  return null;
}

function mvr(v: unknown): string | null {
  const n = num(v);
  if (n == null) return null;
  return `${new Intl.NumberFormat(undefined, { maximumFractionDigits: 2 }).format(n)} MVR`;
}

export type NotificationDisplay = {
  /** Listing / lot name when present in payload (or inferred). */
  lotTitle: string | null;
  /** Extra lines under the lot title (codes, amounts, reasons). */
  detailLines: string[];
};

function takeSummaryLines(full: string[], max: number): string[] {
  if (full.length <= max) return full;
  return [...full.slice(0, max), "Open the listing for the full notice and next steps."];
}

export function getNotificationDisplay(type: string, payload: Record<string, unknown>): NotificationDisplay {
  const lotTitle = str(payload.title);
  const lines: string[] = [];

  switch (type) {
    case "listing_approved_with_codes": {
      const bn = str(payload.bid_number);
      const cc = str(payload.communication_code);
      const title = lotTitle ?? "your item";
      if (bn && cc) {
        lines.push(...takeSummaryLines(sellerListingLiveParagraphs(title, bn, cc), 5));
      } else {
        if (bn) lines.push(`Bid number: ${bn}`);
        if (cc) lines.push(`Communication code: ${cc}`);
        lines.push("Your listing is live — tap to open it.");
      }
      break;
    }
    case "listing_approved": {
      lines.push("Your listing was approved — tap to view.");
      break;
    }
    case "listing_rejected": {
      const r = str(payload.reason) ?? "No reason provided.";
      lines.push(`Reason: ${r}`);
      break;
    }
    case "featured_listing_fee_verified": {
      lines.push("Your featured listing payment was accepted. This listing is now on the featured tier.");
      break;
    }
    case "featured_fee_request_rejected": {
      const r = str(payload.reason) ?? "No reason provided.";
      lines.push(`Reason: ${r}`);
      lines.push("You can submit a new proof from My auctions if needed.");
      break;
    }
    case "payment_proof_received": {
      lines.push("We received your listing fee proof. Tap to view status.");
      break;
    }
    case "winner_consent_requested": {
      const bn = str(payload.bid_number);
      const wa = mvr(payload.winning_amount);
      const pos = num(payload.position) ?? 1;
      const sp = formatMaldivesPhoneDisplay(str(payload.seller_phone));
      const cc = str(payload.communication_code) ?? "—";
      const title = lotTitle ?? "this item";
      if (bn && wa) {
        lines.push(
          ...takeSummaryLines(
            winnerConsentRequestedParagraphs({
              itemName: title,
              bidNumber: bn,
              winningAmountLabel: wa,
              sellerPhoneDisplay: sp,
              communicationCode: cc,
              position: pos,
            }),
            7,
          ),
        );
      } else {
        if (bn) lines.push(`Bid number: ${bn}`);
        if (wa) lines.push(`Winning bid: ${wa}`);
        lines.push("Action needed: review terms and give consent on the listing.");
      }
      break;
    }
    case "winner_consented": {
      const bn = str(payload.bid_number);
      const wa = mvr(payload.winning_amount);
      const pos = num(payload.position) ?? 1;
      const wp = formatMaldivesPhoneDisplay(str(payload.winner_phone));
      const title = lotTitle ?? "this item";
      if (bn && wa) {
        lines.push(
          ...takeSummaryLines(
            sellerPaymentStageParagraphs({
              itemName: title,
              bidNumber: bn,
              winningAmountLabel: wa,
              position: pos,
              winnerPhoneDisplay: wp,
            }),
            8,
          ),
        );
      } else {
        lines.push("The winner gave consent — open the listing to contact them and submit closure when ready.");
      }
      break;
    }
    case "auction_pending_winner_consent": {
      const bn = str(payload.bid_number);
      const wa = mvr(payload.winning_amount);
      const title = lotTitle ?? "your listing";
      if (wa) {
        lines.push(
          ...takeSummaryLines(
            sellerHighBidderPendingConsentParagraphs({
              itemName: title,
              bidNumber: bn,
              winningAmountLabel: wa,
            }),
            6,
          ),
        );
      } else {
        lines.push("Bidding closed — a high bidder must complete consent before you can contact them.");
      }
      break;
    }
    case "please_leave_feedback": {
      lines.push("Tell us how the sale went — tap to leave feedback.");
      break;
    }
    case "auction_winner": {
      const a = mvr(payload.amount);
      if (a) lines.push(`Leading amount: ${a}`);
      lines.push("Legacy notice — open the listing for current status and consent steps.");
      break;
    }
    case "auction_ended": {
      lines.push(
        lotTitle
          ? "Bidding has ended on this lot — tap to see the result."
          : "An auction you bid on has ended — tap to open it.",
      );
      break;
    }
    case "bid_placed": {
      const a = mvr(payload.amount);
      if (a) lines.push(`Your bid: ${a}`);
      break;
    }
    case "outbid": {
      const a = mvr(payload.new_amount);
      if (a) lines.push(`New leading bid: ${a}`);
      lines.push("Tap to raise your bid if the lot is still open.");
      break;
    }
    case "marked_paid": {
      lines.push("The seller marked this auction as paid.");
      break;
    }
    case "won_auction": {
      lines.push("You won — check the listing for payment instructions.");
      break;
    }
    default: {
      const bn = str(payload.bid_number);
      const reason = str(payload.reason);
      const amt = mvr(payload.amount) ?? mvr(payload.new_amount) ?? mvr(payload.winning_amount);
      if (bn) lines.push(`Bid: ${bn}`);
      if (amt) lines.push(`Amount: ${amt}`);
      if (reason) lines.push(`Note: ${reason}`);
      break;
    }
  }

  return { lotTitle, detailLines: lines };
}

export function formatNotificationAlertBody(type: string, payload: Record<string, unknown>): string {
  const { lotTitle, detailLines } = getNotificationDisplay(type, payload);
  const parts: string[] = [];
  if (lotTitle) parts.push(lotTitle);
  parts.push(...detailLines);
  return parts.filter(Boolean).join("\n\n") || "No extra details.";
}
