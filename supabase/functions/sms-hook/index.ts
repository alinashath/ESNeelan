// Supabase Auth Hook: Send SMS — forwards Supabase-generated OTP via MsgOwl REST.
// https://supabase.com/docs/guides/auth/auth-hooks/send-sms-hook

const corsHeaders: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

function normalizeMsgOwlRecipient(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  if (digits.startsWith("960")) return digits;
  if (digits.length === 7) return `960${digits}`;
  return digits;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const accessKey = Deno.env.get("MSGOWL_ACCESS_KEY");
    const senderId = Deno.env.get("MSGOWL_SENDER_ID") ?? "BIDSTREAM";
    if (!accessKey) {
      console.warn("sms-hook: MSGOWL_ACCESS_KEY not set; skipping send");
      return new Response(JSON.stringify({}), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const payload = await req.json();
    const phone: string | undefined =
      payload.user?.phone ?? payload.phone ?? payload.user?.new_phone;
    const otp: string | undefined =
      payload.sms?.otp ?? payload.otp ?? payload.token;

    if (!phone || !otp) {
      console.error("sms-hook: missing phone or otp", JSON.stringify(payload));
      return new Response(JSON.stringify({ error: "missing_fields" }), {
        status: 422,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

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
