import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

function subjectForType(type: string): string {
  switch (type) {
    case "bid_placed":
      return "BIDSTREAM: Bid placed";
    case "outbid":
      return "BIDSTREAM: You were outbid";
    case "won_auction":
      return "BIDSTREAM: You won an auction";
    case "auction_winner":
      return "BIDSTREAM: Your auction has a winner";
    case "auction_ended":
      return "BIDSTREAM: Auction ended";
    case "listing_approved":
      return "BIDSTREAM: Listing approved";
    case "listing_rejected":
      return "BIDSTREAM: Listing rejected";
    case "marked_paid":
      return "BIDSTREAM: Seller marked payment received";
    default:
      return "BIDSTREAM notification";
  }
}

function bodyText(type: string, payload: Record<string, unknown>): string {
  return `${type}\n\n${JSON.stringify(payload, null, 2)}`;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const resendKey = Deno.env.get("RESEND_API_KEY");
  const from = Deno.env.get("NOTIFY_FROM_EMAIL") ?? "onboarding@resend.dev";

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
      const { data: u, error: uerr } = await admin.auth.admin.getUserById(
        row.user_id,
      );
      if (uerr || !u.user?.email) {
        await admin
          .from("notification_outbox")
          .update({
            error: uerr?.message ?? "no_email",
            sent_at: new Date().toISOString(),
          })
          .eq("id", row.id);
        continue;
      }

      const email = u.user.email;
      const payload = (row.payload ?? {}) as Record<string, unknown>;

      if (!resendKey) {
        console.log(
          "DEV notify (no RESEND_API_KEY):",
          email,
          row.type,
          payload,
        );
        await admin
          .from("notification_outbox")
          .update({ sent_at: new Date().toISOString() })
          .eq("id", row.id);
        processed++;
        continue;
      }

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
          text: bodyText(row.type, payload),
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

      await admin
        .from("notification_outbox")
        .update({ sent_at: new Date().toISOString(), error: null })
        .eq("id", row.id);
      processed++;
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
