#!/usr/bin/env node
/**
 * Seed active auctions with dummy bidders and heavy bid activity.
 *
 * Default: keeps listings LIVE (status active) so they stay on the home page.
 * Pass --mark-sold to mark completed (hides from Trending / home).
 *
 * Usage:
 *   node scripts/seed-active-auctions-sold.mjs
 *   node scripts/seed-active-auctions-sold.mjs --mark-sold
 *   node scripts/seed-active-auctions-sold.mjs --dry-run
 */

import { createClient } from "@supabase/supabase-js";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

const WINNER_TERMS_VERSION = "2025-06-16";
const MIN_BIDS = 22;
const MAX_BIDS = 42;

/** Dev-only fake bidders — invalid +960 8… numbers (not shown publicly). */
const SEED_BIDDERS = [
  { name: "Mohamed", slug: "mohamed", phone: "+9608000001" },
  { name: "Ayya", slug: "ayya", phone: "+9608000002" },
  { name: "Huwey", slug: "huwey", phone: "+9608000003" },
  { name: "Hassan", slug: "hassan", phone: "+9608000004" },
  { name: "Ibrahim", slug: "ibrahim", phone: "+9608000005" },
  { name: "Fathimath", slug: "fathimath", phone: "+9608000006" },
  { name: "Ahmed", slug: "ahmed", phone: "+9608000007" },
  { name: "Aayan", slug: "aayan", phone: "+9608000008" },
  { name: "Ali", slug: "ali", phone: "+9608000009" },
  { name: "Mode", slug: "mode", phone: "+9608000010" },
];

function loadEnvFile() {
  const envPath = path.join(process.cwd(), ".env");
  if (!fs.existsSync(envPath)) return;
  for (const line of fs.readFileSync(envPath, "utf8").split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (!(key in process.env)) process.env[key] = value;
  }
}

function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function pickRandom(items) {
  return items[Math.floor(Math.random() * items.length)];
}

function roundMoney(n) {
  return Math.round(n * 100) / 100;
}

function communicationCode(auctionId) {
  return crypto
    .createHash("md5")
    .update(`${auctionId}-${crypto.randomUUID()}`)
    .digest("hex")
    .slice(0, 8)
    .toUpperCase();
}

function assertServiceRoleKey(serviceKey, anonKey) {
  if (!serviceKey?.trim()) {
    throw new Error("SUPABASE_SERVICE_ROLE_KEY is empty.");
  }

  if (anonKey && serviceKey === anonKey) {
    throw new Error(
      [
        "SUPABASE_SERVICE_ROLE_KEY is the same as EXPO_PUBLIC_SUPABASE_ANON_KEY.",
        "Copy the service_role secret from Supabase Dashboard → Settings → API.",
        "It is NOT the sb_publishable_ key (that is the anon/client key).",
        "",
        "Without it, run the SQL script in Dashboard → SQL Editor instead:",
        "  supabase/scripts/seed-active-auctions-sold.sql",
      ].join("\n"),
    );
  }

  if (serviceKey.startsWith("sb_publishable_")) {
    throw new Error(
      [
        "SUPABASE_SERVICE_ROLE_KEY looks like a publishable (anon) key.",
        "Use the service_role secret from Supabase Dashboard → Settings → API.",
        "",
        "Or run without API keys via SQL Editor:",
        "  supabase/scripts/seed-active-auctions-sold.sql",
      ].join("\n"),
    );
  }
}

/** Simulate a lively auction: early interest, mid bidding, late war between a few bidders. */
function generateActiveBids(auction, eligible, existingHigh = null) {
  const increment = Number(auction.min_bid_increment);
  const starting = Number(auction.starting_price);
  const starts = new Date(auction.starts_at);
  const ends = new Date(auction.ends_at);
  const spanMs = Math.max(ends.getTime() - starts.getTime(), 24 * 60 * 60 * 1000);

  const nBids = randomInt(MIN_BIDS, MAX_BIDS);
  const competitorCount = Math.min(eligible.length, randomInt(5, 8));
  const competitors = [...eligible].sort(() => Math.random() - 0.5).slice(0, competitorCount);
  const warPool = competitors.slice(0, randomInt(2, Math.min(4, competitors.length)));

  const draft = [];
  for (let i = 0; i < nBids; i += 1) {
    const progress = (i + 1) / nBids;
    const frenzy = progress > 0.7;
    const pool = frenzy ? warPool : competitors;
    const bidder = pickRandom(pool);

    let createdAt;
    if (frenzy) {
      const minutesToEnd = randomInt(0, 55);
      createdAt = new Date(ends.getTime() - minutesToEnd * 60 * 1000 - randomInt(0, 50) * 1000);
      if (createdAt < starts) {
        createdAt = new Date(starts.getTime() + spanMs * (0.85 + Math.random() * 0.14));
      }
    } else {
      const timeSkew = Math.pow(Math.random(), 0.5);
      createdAt = new Date(starts.getTime() + spanMs * timeSkew * 0.85);
    }

    draft.push({ bidder, createdAt, jump: frenzy ? randomInt(1, 5) : randomInt(1, 2) });
  }

  draft.sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());

  let amount =
    existingHigh != null ? Number(existingHigh) : starting - increment;

  const bids = [];
  for (const row of draft) {
    amount = amount + increment * row.jump;
    bids.push({
      auction_id: auction.id,
      bidder_id: row.bidder.id,
      amount: roundMoney(amount),
      created_at: row.createdAt.toISOString(),
      _name: row.bidder.name,
    });
  }

  return bids;
}

async function ensureSeedBidder(supabase, seed) {
  const email = `auc-seed-${seed.slug}@effimetic.dev`;

  const { data: profileByPhone, error: profileByPhoneError } = await supabase
    .from("profiles")
    .select("id, display_name, phone, suspended_at")
    .eq("phone", seed.phone)
    .maybeSingle();

  if (profileByPhoneError) throw profileByPhoneError;

  if (profileByPhone) {
    if (profileByPhone.display_name !== seed.name) {
      const { error } = await supabase
        .from("profiles")
        .update({ display_name: seed.name, updated_at: new Date().toISOString() })
        .eq("id", profileByPhone.id);
      if (error) throw error;
      profileByPhone.display_name = seed.name;
    }
    return { ...profileByPhone, name: seed.name };
  }

  const { data: profileByName, error: profileByNameError } = await supabase
    .from("profiles")
    .select("id, display_name, phone, suspended_at")
    .eq("display_name", seed.name)
    .maybeSingle();

  if (profileByNameError) throw profileByNameError;

  if (profileByName) {
    if (profileByName.phone !== seed.phone) {
      const { error } = await supabase
        .from("profiles")
        .update({ phone: seed.phone, updated_at: new Date().toISOString() })
        .eq("id", profileByName.id);
      if (error) throw error;
      profileByName.phone = seed.phone;
    }
    return { ...profileByName, name: seed.name };
  }

  let userId = null;

  const { data: phoneUser, error: phoneError } = await supabase.auth.admin.createUser({
    phone: seed.phone,
    phone_confirm: true,
    user_metadata: { display_name: seed.name },
  });

  if (!phoneError) {
    userId = phoneUser.user.id;
  } else {
    const { data: emailUser, error: emailError } = await supabase.auth.admin.createUser({
      email,
      password: crypto.randomBytes(24).toString("hex"),
      email_confirm: true,
      user_metadata: { display_name: seed.name, seed_phone: seed.phone },
    });
    if (emailError) throw new Error(`${seed.name}: ${phoneError.message}; ${emailError.message}`);
    userId = emailUser.user.id;
  }

  const { data: upserted, error: upsertError } = await supabase
    .from("profiles")
    .upsert(
      {
        id: userId,
        phone: seed.phone,
        display_name: seed.name,
        role: "buyer",
        updated_at: new Date().toISOString(),
      },
      { onConflict: "id" },
    )
    .select("id, display_name, phone, suspended_at")
    .single();

  if (upsertError) throw upsertError;
  return { ...upserted, name: seed.name };
}

async function ensureSeedBidders(supabase, dryRun) {
  if (dryRun) {
    console.log("[dry-run] Would ensure seed bidders:", SEED_BIDDERS.map((b) => b.name).join(", "));
    return SEED_BIDDERS.map((b) => ({
      id: `dry-run-${b.phone}`,
      name: b.name,
      phone: b.phone,
      suspended_at: null,
    }));
  }

  const bidders = [];
  for (const seed of SEED_BIDDERS) {
    const bidder = await ensureSeedBidder(supabase, seed);
    bidders.push(bidder);
    console.log(`Bidder ready: ${bidder.name} (${bidder.phone})`);
  }
  return bidders;
}

function eligibleBidders(seedBidders, sellerId) {
  return seedBidders.filter((p) => p.id !== sellerId && p.suspended_at == null);
}

async function main() {
  loadEnvFile();

  const dryRun = process.argv.includes("--dry-run");
  const markSold = process.argv.includes("--mark-sold");
  const url = process.env.EXPO_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL;
  const anonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceKey) {
    console.error(
      "Missing EXPO_PUBLIC_SUPABASE_URL (or SUPABASE_URL) and SUPABASE_SERVICE_ROLE_KEY in the environment.",
    );
    console.error(
      "Add SUPABASE_SERVICE_ROLE_KEY to .env (Dashboard → Settings → API → service_role).",
    );
    console.error("Or run: supabase/scripts/seed-active-auctions-sold.sql in SQL Editor.");
    process.exit(1);
  }

  try {
    assertServiceRoleKey(serviceKey, anonKey);
  } catch (err) {
    console.error(err.message);
    process.exit(1);
  }

  const supabase = createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const seedBidders = await ensureSeedBidders(supabase, dryRun);

  const { data: auctions, error: auctionsError } = await supabase
    .from("auctions")
    .select("*")
    .eq("status", "active")
    .order("created_at");

  if (auctionsError) throw auctionsError;

  if (!auctions?.length) {
    console.log("No active auctions to update.");
    return;
  }

  let sold = 0;
  let skipped = 0;

  for (const auction of auctions) {
    const eligible = eligibleBidders(seedBidders, auction.seller_id);

    if (!eligible.length) {
      console.warn(`Skip ${auction.id} (${auction.title}): seller owns all seed bidders`);
      skipped += 1;
      continue;
    }

    const { data: existingBids, error: existingError } = await supabase
      .from("bids")
      .select("amount")
      .eq("auction_id", auction.id)
      .order("amount", { ascending: false })
      .limit(1);

    if (existingError) throw existingError;

    const existingHigh = existingBids?.[0]?.amount ?? null;
    const newBids = generateActiveBids(auction, eligible, existingHigh);
    const nBidsActual = newBids.length;
    const ends = new Date(auction.ends_at);
    const winner = [...newBids].sort((a, b) => b.amount - a.amount)[0];
    const liveEndsAt = new Date(
      Math.max(ends.getTime(), Date.now() + 14 * 24 * 60 * 60 * 1000),
    ).toISOString();
    const soldEndsAt = new Date(Math.min(ends.getTime(), Date.now() - 60_000)).toISOString();
    const bidNumber =
      auction.bid_number ??
      `BID-${String(Date.now()).slice(-5)}${String(randomInt(0, 99)).padStart(2, "0")}`;
    const commCode = auction.communication_code ?? communicationCode(auction.id);

    console.log(
      `${dryRun ? "[dry-run] " : ""}${markSold ? "Sell" : "Seed"} "${auction.title}": ${nBidsActual} bids (${new Set(newBids.map((b) => b._name)).size} bidders)${markSold ? ` → winner ${winner._name} @ MVR ${winner.amount}` : ` → top bid MVR ${winner.amount}, stays live`}`,
    );

    if (dryRun) {
      sold += 1;
      continue;
    }

    const bidsToInsert = newBids.map(({ _name, ...row }) => row);
    const { error: insertError } = await supabase.from("bids").insert(bidsToInsert);
    if (insertError) throw insertError;

    const { data: topBid, error: topError } = await supabase
      .from("bids")
      .select("bidder_id, amount")
      .eq("auction_id", auction.id)
      .order("amount", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(1)
      .single();

    if (topError) throw topError;

    const { count: bidCount, error: countError } = await supabase
      .from("bids")
      .select("*", { count: "exact", head: true })
      .eq("auction_id", auction.id);

    if (countError) throw countError;

    if (markSold) {
      const { error: updateError } = await supabase
        .from("auctions")
        .update({
          status: "completed",
          winner_id: topBid.bidder_id,
          current_highest_bid: topBid.amount,
          bid_count: bidCount ?? bidsToInsert.length,
          bid_number: bidNumber,
          communication_code: commCode,
          winner_consent_given: true,
          winner_consent_terms_version:
            auction.winner_consent_terms_version ?? WINNER_TERMS_VERSION,
          winner_position: 1,
          ends_at: soldEndsAt,
          updated_at: new Date().toISOString(),
        })
        .eq("id", auction.id);

      if (updateError) throw updateError;

      const { data: cascadeRow } = await supabase
        .from("winner_cascade")
        .select("id")
        .eq("auction_id", auction.id)
        .eq("bidder_id", topBid.bidder_id)
        .maybeSingle();

      if (!cascadeRow) {
        const { error: cascadeError } = await supabase.from("winner_cascade").insert({
          auction_id: auction.id,
          bidder_id: topBid.bidder_id,
          position: 1,
          consented_at: new Date().toISOString(),
          closure_outcome: "completed",
        });
        if (cascadeError) throw cascadeError;
      }

      const { error: reportError } = await supabase.from("auction_closure_reports").insert({
        auction_id: auction.id,
        seller_id: auction.seller_id,
        outcome: "completed",
        notes: "Dev seed: random bids + marked sold",
        select_next: false,
      });
      if (reportError) throw reportError;
    } else {
      const { error: updateError } = await supabase
        .from("auctions")
        .update({
          status: "active",
          current_highest_bid: topBid.amount,
          bid_count: bidCount ?? bidsToInsert.length,
          bid_number: auction.bid_number ?? bidNumber,
          communication_code: auction.communication_code ?? commCode,
          ends_at: liveEndsAt,
          updated_at: new Date().toISOString(),
        })
        .eq("id", auction.id);

      if (updateError) throw updateError;
    }

    sold += 1;
  }

  console.log(
    `Done. ${markSold ? "Sold" : "Seeded"}: ${sold}, skipped: ${skipped}${dryRun ? " (dry-run)" : ""}.`,
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
