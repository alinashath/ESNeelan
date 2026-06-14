// Supabase Auth Hook: Send SMS — verifies Standard Webhooks payload, then delivers the OTP via MsgOwl.
// Prefer MsgOwl OTP API (separate key from REST): https://msgowl.com/docs#sendOTP
// REST messages API: https://msgowl.com/docs — requires a REST access key with message.write scope.
// https://supabase.com/docs/guides/auth/auth-hooks/send-sms-hook
import { Webhook } from "https://esm.sh/standardwebhooks@1.0.0";

const corsHeaders: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, webhook-id, webhook-timestamp, webhook-signature",
};

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

    const otpKey = firstEnv("MSG_OWL_OTP_KEY", "MSGOWL_OTP_KEY");
    const restKey = firstEnv(
      "MSGOWL_ACCESS_KEY",
      "MSG_OWL_REST_KEY",
      "MSG_OWL_KEY",
    );
    const senderId = firstEnv("MSGOWL_SENDER_ID", "MSG_OWL_SENDER_ID") ??
      "ESNeelan";
    const otpBase =
      firstEnv("MSG_OWL_OTP_URL", "MSGOWL_OTP_URL") ?? "https://otp.msgowl.com";

    if (!otpKey && !restKey) {
      console.warn(
        "sms-hook: set MSG_OWL_OTP_KEY (OTP API) and/or MSGOWL_ACCESS_KEY / MSG_OWL_REST_KEY (REST); skipping send",
      );
      return new Response(JSON.stringify({}), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { phone, otp } = parsed;
    const phoneNumber = normalizeMsgOwlRecipient(phone);

    let res: Response;
    if (otpKey) {
      // OTP product: same auth style as community SDKs (AccessKey + OTP key, not REST key).
      // Pass Supabase-generated code so the user still verifies with Supabase only.
      res = await fetch(`${otpBase.replace(/\/$/, "")}/send`, {
        method: "POST",
        headers: {
          Authorization: `AccessKey ${otpKey}`,
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({
          phone_number: phoneNumber,
          code: otp,
        }),
      });
    } else {
      const body = `Your ES Neelan code is ${otp}`;
      res = await fetch("https://rest.msgowl.com/messages", {
        method: "POST",
        headers: {
          Authorization: `AccessKey ${restKey!}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          recipients: phoneNumber,
          sender_id: senderId,
          body,
        }),
      });
    }

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
