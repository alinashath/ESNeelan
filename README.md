# BIDSTREAM (ESNeelan) — Expo + Supabase auction MVP

Mobile auction marketplace for **iOS** and **Android** (Expo Router), backed by **Supabase** (Postgres, Auth, Storage, Realtime, Edge Functions). SMS login uses **MsgOwl** as the SMS transport for Supabase phone OTP. Design is **token-based** with small, reusable UI components under `src/components/ui/`.

## Prerequisites

- Node 20+
- [Supabase CLI](https://supabase.com/docs/guides/cli) (Docker required for `supabase start`)
- Expo Go or Xcode / Android Studio for device builds

## 1. Supabase (local)

```bash
cd /Users/alinashath/ESNeelan/ESNeelan
supabase start
```

Copy the **anon key** and **URL** from the CLI output into `.env`:

```bash
cp .env.example .env
# Edit .env — set EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY
```

Apply DB + seed:

```bash
supabase db reset
```

### MsgOwl + phone auth (SMS hook)

Supabase generates the OTP; the **Send SMS** hook forwards it through MsgOwl REST:

1. Deploy or serve the `sms-hook` function.
2. In `supabase/config.toml`, uncomment and set `[auth.hook.send_sms]` to your function URL (see commented block near `[auth.hook.custom_access_token]`).
3. Set secrets (hosted project: Dashboard → Edge Functions secrets; local: `supabase secrets set`):

- `MSGOWL_ACCESS_KEY` — MsgOwl REST API key ([docs](https://www.msgowl.com/docs))
- `MSGOWL_SENDER_ID` — approved sender ID (default in code: `BIDSTREAM`)

The hook posts to `https://rest.msgowl.com/messages` with body `Your BIDSTREAM code is {otp}`.

Phone numbers are normalized to **E.164** `+960…` (Maldives) in the app.

### Admin phones (env)

Edge function `promote-admin` promotes a user to `admin` when their verified phone is listed in **`ADMIN_PHONES`** (comma-separated E.164, e.g. `+9607771234,+9609990000`). Set as a secret on the project, then call the function once after login (the app does this automatically after OTP verify).

### Email notifications (MVP)

- Outbox table: `notification_outbox` (filled by RPCs / close job).
- Edge function **`process-notifications`**: sends via **Resend** when `RESEND_API_KEY` and `NOTIFY_FROM_EMAIL` are set; otherwise logs to console locally.
- Edge function **`close-expired-auctions`**: calls SQL `close_expired_auctions()` then triggers `process-notifications`. Schedule it (e.g. every 2 minutes) in Supabase **Edge Functions → Cron** or an external scheduler calling the function with the **service role** secret.

### Edge function secrets (reference)

| Secret | Used by |
|--------|---------|
| `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` | `close-expired-auctions`, `process-notifications`, `promote-admin` |
| `SUPABASE_ANON_KEY` | `promote-admin` (JWT verify) |
| `ADMIN_PHONES` | `promote-admin` |
| `MSGOWL_ACCESS_KEY`, `MSGOWL_SENDER_ID` | `sms-hook` |
| `RESEND_API_KEY`, `NOTIFY_FROM_EMAIL` | `process-notifications` |

## 2. Expo app

```bash
npm install
npx expo start
```

Open in Expo Go or run `npx expo run:ios` / `run:android`.

## Project layout

| Path | Purpose |
|------|---------|
| `app/` | expo-router routes: tabs, auth, `auction/[id]`, `my-auctions`, `won`, `admin/*` |
| `src/theme/tokens.ts` | Colors, spacing, radii, typography |
| `src/components/ui/` | Atomic UI (text, buttons, inputs, badges, cards, countdown, etc.) |
| `src/lib/supabase.ts` | Supabase client + SecureStore session |
| `src/data/` | TanStack Query hooks |
| `supabase/migrations/` | Schema, RLS, RPCs, storage policies |
| `supabase/functions/` | `sms-hook`, `promote-admin`, `process-notifications`, `close-expired-auctions` |

## Core flows

1. **Login**: Phone OTP via Supabase (`signInWithOtp` / `verifyOtp`) + optional MsgOwl hook.
2. **Create listing**: Draft auction + images in Storage → `submit_auction_for_approval` RPC → `pending_approval`.
3. **Admin**: Approve/reject pending auctions; suspend users.
4. **Bidding**: Client calls `place_bid` RPC (validates increment, self-bid, window, suspension).
5. **Closing**: `close_expired_auctions()` sets `ended`/`won`, winner, outbox emails.

## Status model

`draft` → `pending_approval` → `active` → `ended` / `won` → `paid` → `completed` (plus `cancelled`).

## Supabase + GitHub

The `supabase/` folder is meant to be pushed to GitHub and linked from the Supabase Dashboard (**Integrations → GitHub**). Use **working directory `.`** (repo root). Migrations may run via the integration; **Edge Functions** often need an explicit **`npm run supabase:functions`** (after `supabase link`) unless your integration deploys them on merge — see [`supabase/README.md`](supabase/README.md).

Official: [GitHub integration](https://supabase.com/docs/guides/deployment/branching/github-integration).

## License

See [LICENSE](LICENSE).
