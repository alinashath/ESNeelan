/**
 * Drains `notification_outbox` after inserts from RPCs / close job.
 *
 * **Primary:** In-app alerts (rows are already visible in the app from `notification_outbox`).
 * **SMS:** High-priority types send a short MsgOwl REST SMS when `MSGOWL_ACCESS_KEY` (or alias) + phone exist.
 * **Email:** Opt-in only — set `NOTIFICATION_EMAIL_ENABLED=true` and `RESEND_API_KEY` (minor + routine traffic stay in-app).
 *
 * Single-file entry: Supabase deploy bundling resolves only `index.ts` reliably.
 */
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

// --- MsgOwl REST (transactional SMS) ----------------------------------------

function firstEnv(...names: string[]): string | undefined {
  for (const n of names) {
    const v = Deno.env.get(n);
    if (v != null && String(v).trim() !== "") return v;
  }
  return undefined;
}

function normalizeMsgOwlRecipient(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  if (digits.startsWith("960")) return digits;
  if (digits.length === 7) return `960${digits}`;
  return digits;
}

async function sendMsgOwlRestSms(
  e164OrLocalPhone: string,
  body: string,
): Promise<{ ok: true } | { ok: false; detail: string }> {
  const restKey = firstEnv(
    "MSGOWL_ACCESS_KEY",
    "MSG_OWL_REST_KEY",
    "MSG_OWL_KEY",
  );
  const senderId = firstEnv("MSGOWL_SENDER_ID", "MSG_OWL_SENDER_ID") ?? "ES Neelan";
  if (!restKey) {
    return { ok: false, detail: "no_msgowl_rest_key" };
  }
  const phoneNumber = normalizeMsgOwlRecipient(e164OrLocalPhone);
  if (phoneNumber.length < 9) {
    return { ok: false, detail: "invalid_phone" };
  }
  const trimmed = body.length > 600 ? `${body.slice(0, 597)}...` : body;
  const res = await fetch("https://rest.msgowl.com/messages", {
    method: "POST",
    headers: {
      Authorization: `AccessKey ${restKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      recipients: phoneNumber,
      sender_id: senderId,
      body: trimmed,
    }),
  });
  const text = await res.text();
  if (!res.ok) {
    return { ok: false, detail: `${res.status}: ${text}` };
  }
  return { ok: true };
}

// --- SMS copy (short). SYNC: `src/lib/bidmaster-legal-copy.ts` for app parity.

function str(v: unknown): string | null {
  if (typeof v === "string" && v.trim()) return v.trim();
  return null;
}

function num(v: unknown): number | null {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string" && v.trim() !== "" && Number.isFinite(Number(v))) return Number(v);
  return null;
}

const SMS_ALERT_TYPES = new Set<string>([
  "listing_approved_with_codes",
  "winner_consent_requested",
  "winner_consented",
  "auction_pending_winner_consent",
]);

function buildSmsBody(type: string, payload: Record<string, unknown>): string | null {
  if (!SMS_ALERT_TYPES.has(type)) return null;

  const title = str(payload.title);
  const shortTitle = title && title.length > 40 ? `${title.slice(0, 37)}…` : (title ?? "ES Neelan");

  switch (type) {
    case "listing_approved_with_codes": {
      const bn = str(payload.bid_number);
      const cc = str(payload.communication_code);
      if (!bn || !cc) return `ES Neelan: "${shortTitle}" is live. Open the app for codes.`;
      return `ES Neelan: "${shortTitle}" is LIVE. Bid ${bn}. Code ${cc}. Open the app — keep the code for the winning bidder only.`;
    }
    case "winner_consent_requested": {
      const bn = str(payload.bid_number);
      const pos = num(payload.position) ?? 1;
      const p = pos > 1 ? ` Pos ${pos}.` : " ";
      return `ES Neelan: You won "${shortTitle}".${p}${bn ? ` ${bn}.` : ""} Open the app — consent required.`;
    }
    case "winner_consented": {
      return `ES Neelan: "${shortTitle}" — winner consented. Open the app for their phone & closure.`;
    }
    case "auction_pending_winner_consent": {
      return `ES Neelan: "${shortTitle}" closed. Wait for winner consent before contact. Open the app.`;
    }
    default:
      return null;
  }
}

// --- Email body (Resend). SYNC: `src/lib/bidmaster-legal-copy.ts` ------------

function mvr(v: unknown): string | null {
  const n = num(v);
  if (n == null) return null;
  return `${new Intl.NumberFormat(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(n)} MVR`;
}

function joinParas(lines: string[]): string {
  return lines.filter(Boolean).join("\n\n");
}

function formatMaldivesPhoneDisplay(phone: string | null | undefined): string {
  const raw = (phone ?? "").trim();
  if (!raw) return "+960 …";
  if (raw.startsWith("+")) return raw;
  const digits = raw.replace(/\D/g, "");
  const rest = digits.startsWith("960") ? digits.slice(3) : digits;
  return `+960 ${rest}`.trim();
}

function platformMarketplaceDisclaimer(): string[] {
  return [
    "Neelan is a platform that connects buyers and sellers. Neelan is not responsible for any payment, delivery, or transaction related issues.",
    "All payment and delivery arrangements are to be agreed directly between the buyer and the seller on mutually acceptable terms.",
    "Please clarify details regarding payment, delivery, return policies, and any other pre-sale or after-sale arrangements before making payment.",
  ];
}

function sellerCancellationAndEnforcementDisclaimer(): string[] {
  return [
    "The seller has the right to cancel the bid if the payment is not received on time or if both parties could not agree on terms of the transaction.",
    "Cancellation of a bid due to failure to make payment within the allocated time, or any loss caused to the seller due to the winning bidder's failure to disclose required information, fraud or misrepresentation, may result in the bidder being blacklisted or banned from using this platform.",
    "The platform reserves the right to provide necessary information to relevant law enforcement authorities where required.",
  ];
}

function sellerListingLiveParagraphs(
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

function winnerConsentRequestedParagraphs(args: {
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
  if (position > 1) lines.push(`Position: ${position}`);
  lines.push(
    `The seller will contact you on ${sellerPhoneDisplay} regarding payment and delivery arrangements.`,
    `Your communication code for this transaction is: ${communicationCode}`,
    "Please do not share this code with anyone. Do not accept payment instructions that do not contain this code.",
    ...platformMarketplaceDisclaimer(),
    ...sellerCancellationAndEnforcementDisclaimer(),
  );
  return lines;
}

function sellerPaymentStageParagraphs(args: {
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

function sellerHighBidderPendingConsentParagraphs(args: {
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

function buildEmailBody(type: string, payload: Record<string, unknown>): string {
  const title = str(payload.title);

  switch (type) {
    case "listing_approved_with_codes": {
      const bn = str(payload.bid_number);
      const cc = str(payload.communication_code);
      const item = title ?? "your item";
      if (bn && cc) return joinParas(sellerListingLiveParagraphs(item, bn, cc));
      return joinParas([
        "Your listing is live on ES Neelan.",
        ...(bn ? [`Bid number: ${bn}`] : []),
        ...(cc ? [`Communication code: ${cc}`] : []),
        "Open the app to view your listing.",
      ]);
    }
    case "winner_consent_requested": {
      const bn = str(payload.bid_number);
      const wa = mvr(payload.winning_amount);
      const pos = num(payload.position) ?? 1;
      const sp = formatMaldivesPhoneDisplay(str(payload.seller_phone));
      const cc = str(payload.communication_code) ?? "—";
      const item = title ?? "this item";
      if (bn && wa) {
        return joinParas(
          winnerConsentRequestedParagraphs({
            itemName: item,
            bidNumber: bn,
            winningAmountLabel: wa,
            sellerPhoneDisplay: sp,
            communicationCode: cc,
            position: pos,
          }),
        );
      }
      return joinParas([
        "You have a winning bid pending consent.",
        "Open the ES Neelan app to review the full notice and give consent.",
      ]);
    }
    case "winner_consented": {
      const bn = str(payload.bid_number);
      const wa = mvr(payload.winning_amount);
      const pos = num(payload.position) ?? 1;
      const wp = formatMaldivesPhoneDisplay(str(payload.winner_phone));
      const item = title ?? "this item";
      if (bn && wa) {
        return joinParas(
          sellerPaymentStageParagraphs({
            itemName: item,
            bidNumber: bn,
            winningAmountLabel: wa,
            position: pos,
            winnerPhoneDisplay: wp,
          }),
        );
      }
      return joinParas([
        "The winner has given consent.",
        "Open the ES Neelan app to contact them and continue closure.",
      ]);
    }
    case "auction_pending_winner_consent": {
      const bn = str(payload.bid_number);
      const wa = mvr(payload.winning_amount);
      const item = title ?? "your listing";
      if (wa) {
        return joinParas(
          sellerHighBidderPendingConsentParagraphs({
            itemName: item,
            bidNumber: bn,
            winningAmountLabel: wa,
          }),
        );
      }
      return joinParas([
        "Bidding has closed on your listing.",
        "A high bidder must complete platform consent before you can contact them.",
        "Open the ES Neelan app for details.",
      ]);
    }
    case "auction_winner": {
      return joinParas([
        "Your auction received bids and a high bidder was selected.",
        "Use the app for the latest status — winner contact is shared only after they give consent.",
      ]);
    }
    case "please_leave_feedback": {
      return joinParas([
        title ? `Lot: ${title}` : "Your purchase",
        "Please leave feedback for the seller in the ES Neelan app.",
      ]);
    }
    case "listing_rejected": {
      const r = str(payload.reason) ?? "No reason provided.";
      return joinParas([title ? `Listing: ${title}` : "Your listing", `Reason: ${r}`]);
    }
    case "auction_ended": {
      return joinParas([
        title ? `Lot: ${title}` : "An auction you bid on",
        "Bidding has ended — open the ES Neelan app to see the result.",
      ]);
    }
    case "marked_paid": {
      return joinParas(["The seller marked payment as received.", "Open the app for details."]);
    }
    case "outbid": {
      const a = mvr(payload.new_amount);
      return joinParas([
        title ? `Lot: ${title}` : "An auction",
        ...(a ? [`New leading bid: ${a}`] : []),
        "You may place a higher bid if the auction is still open.",
      ]);
    }
    case "bid_placed": {
      const a = mvr(payload.amount);
      return joinParas([title ? `Lot: ${title}` : "Auction", ...(a ? [`Your bid: ${a}`] : [])]);
    }
    default:
      return joinParas([
        `Notification: ${type}`,
        title ? `Lot: ${title}` : "",
        JSON.stringify(payload, null, 2),
      ]);
  }
}

// --- HTTP handler -------------------------------------------------------------

const corsHeaders: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

function truthyEnv(name: string): boolean {
  const v = Deno.env.get(name);
  if (v == null || String(v).trim() === "") return false;
  return ["1", "true", "yes", "on"].includes(v.trim().toLowerCase());
}

function subjectForType(type: string): string {
  switch (type) {
    case "bid_placed":
      return "ES Neelan: Bid placed";
    case "outbid":
      return "ES Neelan: You were outbid";
    case "listing_approved_with_codes":
      return "ES Neelan: Your bid is live — codes inside";
    case "winner_consent_requested":
      return "ES Neelan: You won — action needed";
    case "winner_consented":
      return "ES Neelan: Winner confirmed";
    case "please_leave_feedback":
      return "ES Neelan: How was your experience?";
    case "payment_proof_received":
      return "ES Neelan: Payment proof received";
    case "won_auction":
      return "ES Neelan: You won an auction";
    case "auction_pending_winner_consent":
      return "ES Neelan: Bidding closed — winner must consent";
    case "auction_ended":
      return "ES Neelan: Auction ended";
    case "listing_approved":
      return "ES Neelan: Listing approved";
    case "listing_rejected":
      return "ES Neelan: Listing rejected";
    case "featured_listing_fee_verified":
      return "ES Neelan: Featured listing fee verified";
    case "featured_fee_request_rejected":
      return "ES Neelan: Featured fee request declined";
    case "marked_paid":
      return "ES Neelan: Seller marked payment received";
    default:
      return "ES Neelan notification";
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const resendKey = Deno.env.get("RESEND_API_KEY");
  const from = Deno.env.get("NOTIFY_FROM_EMAIL") ?? "onboarding@resend.dev";
  const emailEnabled = truthyEnv("NOTIFICATION_EMAIL_ENABLED");

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const admin = createClient(supabaseUrl, serviceKey);

    const { data: rows, error: qerr } = await admin
      .from("notification_outbox")
      .select("id, user_id, type, payload")
      .is("sent_at", null)
      .order("created_at", { ascending: true })
      .limit(40);

    if (qerr) {
      console.error(qerr);
      return new Response(JSON.stringify({ error: qerr.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!rows?.length) {
      return new Response(JSON.stringify({ processed: 0 }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let processed = 0;
    for (const row of rows) {
      const payload = (row.payload ?? {}) as Record<string, unknown>;
      const smsText = buildSmsBody(row.type, payload);

      const { data: prof, error: perr } = await admin
        .from("profiles")
        .select("phone")
        .eq("id", row.user_id)
        .maybeSingle();
      if (perr) console.warn("profiles phone", perr.message);
      const phone = typeof prof?.phone === "string" ? prof.phone.trim() : "";

      let smsSent = false;
      let smsHardFail: string | null = null;

      if (smsText && phone) {
        const r = await sendMsgOwlRestSms(phone, smsText);
        if (r.ok) {
          smsSent = true;
        } else if (r.detail === "no_msgowl_rest_key" || r.detail === "invalid_phone") {
          console.log("process-notifications: SMS skipped", row.type, r.detail);
        } else {
          smsHardFail = r.detail;
        }
      }

      if (smsHardFail) {
        await admin
          .from("notification_outbox")
          .update({ error: smsHardFail })
          .eq("id", row.id);
        continue;
      }

      let emailSent = false;
      if (!smsSent && emailEnabled && resendKey) {
        const { data: u, error: uerr } = await admin.auth.admin.getUserById(
          row.user_id,
        );
        const email = u?.user?.email;
        if (!uerr && email) {
          const r = await fetch("https://api.resend.com/emails", {
            method: "POST",
            headers: {
              Authorization: `Bearer ${resendKey}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              from,
              to: email,
              subject: subjectForType(row.type),
              text: buildEmailBody(row.type, payload),
            }),
          });
          if (!r.ok) {
            const t = await r.text();
            await admin
              .from("notification_outbox")
              .update({ error: t })
              .eq("id", row.id);
            continue;
          }
          emailSent = true;
        }
      }

      await admin
        .from("notification_outbox")
        .update({
          sent_at: new Date().toISOString(),
          error: null,
        })
        .eq("id", row.id);
      processed++;

      if (!smsSent && !emailSent && !emailEnabled) {
        console.log(
          "process-notifications: in-app only",
          row.type,
          row.user_id,
        );
      }
    }

    return new Response(JSON.stringify({ processed }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error(e);
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
