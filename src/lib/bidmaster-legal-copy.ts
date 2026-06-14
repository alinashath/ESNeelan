/**
 * Canonical legal / operational copy for bid lifecycle (seller go-live, winner consent,
 * seller payment stage, cascade winners). Used on the auction screen and notification summaries.
 *
 * Email (Resend): duplicate paragraph helpers live in
 * `supabase/functions/process-notifications/index.ts` (`buildEmailBody`) — keep wording in sync when editing.
 */

/** Bump when in-app winner consent wording changes; stored on `auctions.winner_consent_terms_version`. */
export const BIDMASTER_WINNER_TERMS_VERSION = "2025-06-16";

/** Display Maldives seller/buyer lines as +960 … for copy blocks. */
export function formatMaldivesPhoneDisplay(phone: string | null | undefined): string {
  const raw = (phone ?? "").trim();
  if (!raw) return "+960 …";
  if (raw.startsWith("+")) return raw;
  const digits = raw.replace(/\D/g, "");
  const rest = digits.startsWith("960") ? digits.slice(3) : digits;
  return `+960 ${rest}`.trim();
}

export function platformMarketplaceDisclaimer(): string[] {
  return [
    "Neelan is a platform that connects buyers and sellers. Neelan is not responsible for any payment, delivery, or transaction related issues.",
    "All payment and delivery arrangements are to be agreed directly between the buyer and the seller on mutually acceptable terms.",
    "Please clarify details regarding payment, delivery, return policies, and any other pre-sale or after-sale arrangements before making payment.",
  ];
}

export function sellerCancellationAndEnforcementDisclaimer(): string[] {
  return [
    "The seller has the right to cancel the bid if the payment is not received on time or if both parties could not agree on terms of the transaction.",
    "Cancellation of a bid due to failure to make payment within the allocated time, or any loss caused to the seller due to the winning bidder's failure to disclose required information, fraud or misrepresentation, may result in the bidder being blacklisted or banned from using this platform.",
    "The platform reserves the right to provide necessary information to relevant law enforcement authorities where required.",
  ];
}

/** §4 — seller when listing becomes live (after admin approval). */
export function sellerListingLiveParagraphs(
  itemName: string,
  bidNumber: string,
  communicationCode: string,
): string[] {
  return [
    `Your bid for the item "${itemName}" is now live.`,
    `The allocated Bid Number for this item is ${bidNumber} and the Communication Code is ${communicationCode}.`,
    "This code must be used in all communications with the winning bidder and should not be shared with anyone except the bid winner.",
  ];
}

/** §6 / §9 — winning bidder must see before giving consent (includes position for 2nd/3rd winner). */
export function winnerConsentRequestedParagraphs(args: {
  itemName: string;
  bidNumber: string;
  winningAmountLabel: string;
  sellerPhoneDisplay: string;
  communicationCode: string;
  position: number;
}): string[] {
  const { itemName, bidNumber, winningAmountLabel, sellerPhoneDisplay, communicationCode, position } =
    args;
  const lines: string[] = [
    "Congratulations!",
    "You have won the bid for:",
    `Bid No: ${bidNumber}`,
    `Item: ${itemName}`,
    `Winning Amount: ${winningAmountLabel}`,
  ];
  if (position > 1) {
    lines.push(`Position: ${position}`);
  }
  lines.push(
    `The seller will contact you on ${sellerPhoneDisplay} regarding payment and delivery arrangements.`,
    `Your communication code for this transaction is: ${communicationCode}`,
    "Please do not share this code with anyone. Do not accept payment instructions that do not contain this code.",
    ...platformMarketplaceDisclaimer(),
    ...sellerCancellationAndEnforcementDisclaimer(),
  );
  return lines;
}

/** §7 — seller after winner gives consent (payment stage). */
export function sellerPaymentStageParagraphs(args: {
  itemName: string;
  bidNumber: string;
  winningAmountLabel: string;
  position: number;
  winnerPhoneDisplay: string;
}): string[] {
  const { itemName, bidNumber, winningAmountLabel, position, winnerPhoneDisplay } = args;
  return [
    "Congratulations!",
    "Your bid for the following item has reached the payment stage:",
    `Bid No: ${bidNumber}`,
    `Item: ${itemName}`,
    `Winning Amount: ${winningAmountLabel}`,
    `Position: ${position}`,
    `You may now contact the winning bidder on ${winnerPhoneDisplay} regarding payment and delivery arrangements.`,
    ...platformMarketplaceDisclaimer(),
  ];
}

/** Seller when bidding closed but winner has not yet consented (replaces premature “final winner” tone). */
export function sellerHighBidderPendingConsentParagraphs(args: {
  itemName: string;
  bidNumber: string | null;
  winningAmountLabel: string;
}): string[] {
  const { itemName, bidNumber, winningAmountLabel } = args;
  const lines: string[] = [
    "Bidding has closed on your listing.",
    "A high bidder is selected. They must complete platform consent before their phone number is shared with you.",
  ];
  if (bidNumber) lines.push(`Bid No: ${bidNumber}`);
  lines.push(`Current high bid: ${winningAmountLabel}`);
  lines.push(
    "You will receive another notification when you can contact the winner about payment and delivery.",
  );
  return lines;
}
