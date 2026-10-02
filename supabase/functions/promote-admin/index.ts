import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

/** Normalize to E.164 +960XXXXXXX so ADMIN_PHONES can be 7910106 or +9607910106. */
function normalizeAdminPhone(raw: string): string | null {
  const digits = raw.replace(/\D/g, "");
  if (digits.length === 7) return `+960${digits}`;
  if (digits.length === 10 && digits.startsWith("960")) return `+${digits}`;
  if (digits.length >= 11 && digits.startsWith("960")) return `+${digits.slice(0, 10)}`;
  if (raw.trim().startsWith("+") && digits.length >= 10) return `+${digits}`;
  return null;
}

function parseAdminPhones(raw: string | undefined): Set<string> {
  if (!raw) return new Set();
  const out = new Set<string>();
  for (const part of raw.split(",")) {
    const n = normalizeAdminPhone(part.trim());
    if (n) out.add(n);
  }
  return out;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const jwt = authHeader.replace("Bearer ", "").trim();
    const userClient = createClient(supabaseUrl, supabaseAnonKey);
    const {
      data: { user },
      error: userErr,
    } = await userClient.auth.getUser(jwt);
    if (userErr || !user) {
      return new Response(JSON.stringify({ error: "invalid_session" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const rawPhone = user.phone ?? user.user_metadata?.phone_e164;
    const phone = typeof rawPhone === "string" ? normalizeAdminPhone(rawPhone) : null;
    if (!phone) {
      return new Response(JSON.stringify({ ok: true, promoted: false }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const allow = parseAdminPhones(Deno.env.get("ADMIN_PHONES"));
    if (!allow.has(phone)) {
      return new Response(JSON.stringify({ ok: true, promoted: false }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const adminClient = createClient(supabaseUrl, serviceKey);

    const { error } = await adminClient
      .from("profiles")
      .update({ role: "admin", updated_at: new Date().toISOString() })
      .eq("id", user.id);

    if (error) {
      console.error(error);
      return new Response(JSON.stringify({ error: error.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ ok: true, promoted: true }), {
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
