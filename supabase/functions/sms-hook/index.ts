// Supabase Auth Hook: Send SMS — verifies Standard Webhooks payload, then sends OTP via MsgOwl REST.
// https://supabase.com/docs/guides/auth/auth-hooks/send-sms-hook
import { Webhook } from "https://esm.sh/standardwebhooks@1.0.0";

const corsHeaders: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, webhook-id, webhook-timestamp, webhook-signature",
};

function normalizeMsgOwlRecipient(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  if (digits.startsWith("960")) return digits;
  if (digits.length === 7) return `960${digits}`;
  return digits;
}

type Parsed = { phone: string; otp: string };

function parseSendSmsPayload(
  rawBody: string,
  headers: Headers,
): Parsed | { error: string; status?: number } {
  const secret =
    Deno.env.get("SEND_SMS_HOOK_SECRET") ?? Deno.env.get("SMS_HOOK_SECRET");
  if (secret) {
    try {
      const wh = new Webhook(secret.replace(/^v1,whsec_/, ""));
      const hdrs = Object.fromEntries(headers.entries());
      const data = wh.verify(rawBody, hdrs) as {
        user?: { phone?: string };
        sms?: { otp?: string };
      };
      const phone = data.user?.phone;
      const otp = data.sms?.otp;
      if (!phone || !otp) return { error: "missing_fields" };
      return { phone, otp };
    } catch (e) {
      console.error("sms-hook: webhook verify failed", e);
      return { error: "verify_failed", status: 401 };
    }
  }
  try {
    const j = JSON.parse(rawBody) as {
      user?: { phone?: string; new_phone?: string };
      phone?: string;
      sms?: { otp?: string };
      otp?: string;
      token?: string;
    };
    const phone = j.user?.phone ?? j.user?.new_phone ?? j.phone;
    const otp = j.sms?.otp ?? j.otp ?? j.token;
    if (!phone || !otp) return { error: "missing_fields" };
    return { phone, otp };
  } catch {
    return { error: "invalid_json" };
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const rawBody = await req.text();
    const parsed = parseSendSmsPayload(rawBody, req.headers);
    if ("error" in parsed) {
      const st = parsed.status ?? (parsed.error === "missing_fields" ? 422 : 400);
      return new Response(JSON.stringify({ error: parsed.error }), {
        status: st,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const accessKey = Deno.env.get("MSGOWL_ACCESS_KEY");
    const senderId = Deno.env.get("MSGOWL_SENDER_ID") ?? "BIDSTREAM";
    if (!accessKey) {
      console.warn("sms-hook: MSGOWL_ACCESS_KEY not set; skipping send");
      return new Response(JSON.stringify({}), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { phone, otp } = parsed;
    const recipients = normalizeMsgOwlRecipient(phone);
    const body = `Your BIDSTREAM code is ${otp}`;

    const res = await fetch("https://rest.msgowl.com/messages", {
      method: "POST",
      headers: {
        Authorization: `AccessKey ${accessKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        recipients,
        sender_id: senderId,
        body,
      }),
    });

    const text = await res.text();
    if (!res.ok) {
      console.error("MsgOwl error", res.status, text);
      return new Response(JSON.stringify({ error: "msgowl", detail: text }), {
        status: 502,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ ok: true }), {
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
