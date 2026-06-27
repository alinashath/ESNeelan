# ES Neelan (ESNeelan) — Expo + Supabase auction MVP

Mobile auction marketplace for **iOS**, **Android**, and **web** (Expo Router + React Native Web), backed by **Supabase** (Postgres, Auth, Storage, Realtime, Edge Functions). SMS login uses **MsgOwl** as the SMS transport for Supabase phone OTP. Design is **token-based** with small, reusable UI components under `src/components/ui/`. UI/UX heuristics (hierarchy, 8pt rhythm, 60/30/10 color, empty states) follow `AGENTS.md`, which references the **mobile-app-ui-design** Cursor skill.

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
# For production web: set EXPO_PUBLIC_SITE_URL to your public origin (no trailing slash) so
# Open Graph tags, canonical URLs, and native share links use absolute URLs. Optional:
# EXPO_PUBLIC_DEFAULT_OG_IMAGE_URL for a default 1200×630 social preview image.
# Featured listing fee (amount + bank payee) is configured in **Admin → Platform settings** (`app_settings` via RPC `admin_update_app_settings`). Sellers see those values on the featured fee upload screens.
```

Apply DB + seed:

```bash
supabase db reset
```

### MsgOwl + phone auth (SMS hook)

Supabase generates the OTP; the **Send SMS** hook forwards it through MsgOwl.

1. Deploy or serve the `sms-hook` function.
2. In `supabase/config.toml`, set `[auth.hook.send_sms]` to your function URL when using local Auth (see commented notes in that file).
3. Set secrets (hosted: Dashboard → Edge Functions; CLI: `supabase secrets set`):

**Recommended — MsgOwl [OTP API](https://msgowl.com/docs#sendOTP)** (`https://otp.msgowl.com/send`):

- `MSG_OWL_OTP_KEY` or `MSGOWL_OTP_KEY` — OTP **access key** from the MsgOwl console (not the same as the REST bulk key unless your account uses one key for both).
- Optional: `MSG_OWL_OTP_URL` if MsgOwl gives you a non-default OTP base URL.

**Alternative — REST [Messages API](https://msgowl.com/docs)** (`https://rest.msgowl.com/messages`):

- `MSGOWL_ACCESS_KEY` or `MSG_OWL_REST_KEY` or `MSG_OWL_KEY` — REST key with **`message.write`** scope.
- `MSGOWL_SENDER_ID` or `MSG_OWL_SENDER_ID` — approved **sender ID string** (e.g. `Effimetic`), **not** the API key.

If **`MSG_OWL_OTP_KEY`** is set, the hook uses the OTP API and passes Supabase’s `code` in the JSON body so users still verify **only with Supabase**.

The hook also needs **`SEND_SMS_HOOK_SECRET`** matching **Authentication → Hooks → Send SMS** (see `supabase/README.md`).

Apply new DB changes with **`supabase db push`** (or `supabase db reset` locally) after pulling — e.g. profile RLS fix, extended columns, and **`avatars`** storage bucket.

A **401 `Invalid authorization key`** from MsgOwl almost always means the wrong key for the endpoint (e.g. OTP key used on REST, or the sender ID pasted as `MSGOWL_ACCESS_KEY`). Your Dashboard digests for `MSGOWL_ACCESS_KEY` and `MSGOWL_SENDER_ID` should **not** be identical.

Phone numbers are normalized to **E.164** `+960…` (Maldives) in the app.

### Admin phones (env)

Edge function `promote-admin` promotes a user to `admin` when their verified phone is listed in **`ADMIN_PHONES`** (comma-separated E.164, e.g. `+9607771234,+9609990000`). Set as a secret on the project, then call the function once after login (the app does this automatically after OTP verify).

### Alerts: in-app + SMS (email optional)

- **In-app:** Every event is a row in **`notification_outbox`**. The app reads them under **Alerts** (`src/data/notifications.ts`). Minor traffic (outbid, auction ended, listing rejected, etc.) stays **in-app only**.
- **SMS (main nudges):** Edge **`process-notifications`** sends a **short MsgOwl REST** SMS for high-priority types when **`MSGOWL_ACCESS_KEY`** (or `MSG_OWL_REST_KEY` / `MSG_OWL_KEY`) + **`MSGOWL_SENDER_ID`** are set — same REST key family as the non-OTP path in **`sms-hook`**. Types: `listing_approved_with_codes`, `winner_consent_requested`, `winner_consented`, `auction_pending_winner_consent`. Full legal copy stays in the app.
- **Email:** Off by default. Set **`NOTIFICATION_EMAIL_ENABLED=true`** plus **`RESEND_API_KEY`** and **`NOTIFY_FROM_EMAIL`** only if you still want Resend copies.
- **`close-expired-auctions`:** Calls SQL `close_expired_auctions()` then invokes **`process-notifications`**. Schedule it (e.g. every 1–2 minutes) in Supabase **Edge Functions → Cron** or an external scheduler with the **service role** secret.

### Edge function secrets (reference)

| Secret                                                                                                                                                   | Used by                                                                                                    |
| -------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`                                                                                                              | `close-expired-auctions`, `process-notifications`, `promote-admin`                                         |
| `SUPABASE_ANON_KEY`                                                                                                                                      | `promote-admin` (JWT verify)                                                                               |
| `ADMIN_PHONES`                                                                                                                                           | `promote-admin`                                                                                            |
| `MSG_OWL_OTP_KEY` / `MSGOWL_OTP_KEY` (preferred), or `MSGOWL_ACCESS_KEY` / `MSG_OWL_REST_KEY` / `MSG_OWL_KEY` + `MSGOWL_SENDER_ID` / `MSG_OWL_SENDER_ID` | `sms-hook` (OTP or REST); **`process-notifications`** uses the **REST** key + sender for transactional SMS |
| `RESEND_API_KEY`, `NOTIFY_FROM_EMAIL`, optional `NOTIFICATION_EMAIL_ENABLED=true`                                                                        | `process-notifications` (email only when explicitly enabled)                                               |

## 2. Expo app

```bash
npm install
npm run dev
```

Open in Expo Go or run `npx expo run:ios` / `run:android`. Use **`npm run dev`** (or `npx expo start`) for the dev server — **`npm start` serves the production web build** from `./dist` (after `npm run build`), which is what Railway and `Dockerfile` use in production.

### Web (responsive)

Run `npm run web` (or `npx expo start --web`). On large viewports, `Screen` centers content up to **1200px** (`src/theme/layout.ts`); the home trending grid uses **2 / 3 / 4** columns from the measured column width (not the raw window width). **Tabs:** from **768px** width up, the site-style **top** bar shows the logo and text links (`WebTabsHeaderBar`); below that (small desktop window or phone browser), tabs move to the **bottom** with **icon-only** labels like the native app. Global HTML/CSS in `app/+html.tsx` sets viewport fit, horizontal overflow guard, and theme-color for mobile browsers.

#### Host web on Railway

Production web is a **static export** (`app.json` → `expo.web.output: "static"` → `dist/`). A root **`Dockerfile`** builds the site and runs **`scripts/web-server.mjs`** on `0.0.0.0:$PORT` (static files + SPA fallback for `/auction/{id}` and `/article/{slug}` + Open Graph HTML for social crawlers). Railway auto-detects it (`Using detected Dockerfile!` in build logs).

**Why this matters:** [Railpack](https://railpack.com/languages/node) picks **`package.json` → `start` first**. If `start` were `expo start`, the platform would run the **Metro dev server** in production. The browser then requests dev-only URLs such as `/.expo/static-tmp/_error.bundle?...&dev=true`, which do not exist on a static host (404 + non-JavaScript MIME type). **`start` must serve `./dist`**, not Expo dev.

1. In [Railway](https://railway.com), deploy this repo. Ensure the service uses the root **`Dockerfile`** (default when the file exists).
2. Under **Variables**, add the **`EXPO_PUBLIC_*`** keys from `.env.example` (at least `EXPO_PUBLIC_SUPABASE_URL`, `EXPO_PUBLIC_SUPABASE_ANON_KEY`; for SEO/share links set **`EXPO_PUBLIC_SITE_URL`** to your public origin only — e.g. `https://your-app.up.railway.app` with **no trailing slash** and **no path suffix** like `/auction`). Optionally `EXPO_PUBLIC_DEFAULT_OG_IMAGE_URL`, `EXPO_PUBLIC_FUNCTIONS_URL`.
3. **Critical:** Declare the same names in the Dockerfile as **`ARG`** (already done for the common keys) and mark those variables as **available at build time** in Railway so `expo export` can read them. Redeploy after changing them.
4. Redeploy so a new image runs `npm run build` inside Docker, then `node scripts/web-server.mjs`.

Smoke-test locally after `npm run build`:

```bash
PORT=8080 npm start
```

- Open `http://localhost:8080` — home loads.
- Open `http://localhost:8080/auction/<active-listing-uuid>` in a fresh tab — listing loads (no server 404).
- Open `http://localhost:8080/article/<story-slug>` in a fresh tab — story loads (no server 404).
- Share from web — message has title/bid info once; URL is not duplicated in the text.
- OG preview for auctions (replace `<id>` with a real listing UUID):

```bash
curl -s -A "facebookexternalhit/1.1" "http://localhost:8080/auction/<id>" | grep 'og:title'
```

- OG preview for stories (replace `<slug>` with a published story slug):

```bash
curl -s -A "facebookexternalhit/1.1" "http://localhost:8080/article/<slug>" | grep 'og:title'
```

Should return the listing/story title, not the generic site title.

### Profile photos & Storage (important for real devices)

- **Uploads** use `fetch(uri)` → `arrayBuffer()` (not `blob()`), which React Native requires.
- **Viewing** uses the Storage **public** URL. If Supabase is **`http://` on your LAN** (typical for `supabase start` on a phone), set `EXPO_PUBLIC_SUPABASE_URL` to your computer’s **LAN IP** (not `127.0.0.1`), e.g. `http://192.168.1.23:54321`, so the device can reach the API and image URLs.
- Native config in `app.json` allows **local-network HTTP** for images (`NSAllowsLocalNetworking` on iOS, `usesCleartextTraffic` on Android). **Expo Go** ships with its own ATS rules; if avatars still fail on a device with local Supabase, use a **development build** (`npx expo run:ios`) or a **hosted** `https://…supabase.co` project.

## Project layout

| Path                                      | Purpose                                                                             |
| ----------------------------------------- | ----------------------------------------------------------------------------------- |
| `app/`                                    | expo-router routes: tabs, auth, `auction/[id]`, `my-auctions/*`, `won/*`, `admin/*` |
| `app/(tabs)/profile/collections*`         | Seller **collections** (optional groups, cover image, link auctions)                |
| `app/collection/[id]`                     | Public view of a seller collection’s listings                                       |
| `app/won/*`                               | Won lots: searchable list → detail                                                  |
| `src/theme/tokens.ts`                     | Colors, spacing, radii, typography                                                  |
| `src/theme/layout.ts`                     | Web max content width + responsive grid breakpoints                                 |
| `src/components/layout/content-width.tsx` | Context + `useScreenContentWidth()` for lists/carousels inside `Screen`             |
| `src/lib/web-tabs-layout.ts`              | `useWebWideTabHeader()` — web ≥768px uses top logo+nav header                       |
| `src/components/ui/`                      | Atomic UI (text, buttons, inputs, badges, cards, countdown, etc.)                   |
| `src/lib/supabase.ts`                     | Supabase client + SecureStore session                                               |
| `src/data/`                               | TanStack Query hooks                                                                |
| `supabase/migrations/`                    | Schema, RLS, RPCs, storage policies                                                 |
| `supabase/functions/`                     | `sms-hook`, `promote-admin`, `process-notifications`, `close-expired-auctions`      |

## Core flows

1. **Login**: Phone OTP via Supabase (`signInWithOtp` / `verifyOtp`) + optional MsgOwl hook.
2. **Create listing**: Non-admins need **seller verification** (apply from Profile → admin approves). Draft auction + images in Storage → `submit_auction_for_approval` RPC → `pending_approval`.
3. **Admin**: Approve/reject listings; **seller applications**; **platform fee** (`app_settings`); **home featured** lots (multiple, optional `featured_sort_order`); suspend users.
4. **Bidding**: Client calls `place_bid` RPC (validates increment, self-bid, window, suspension). **Realtime** (`postgres_changes`): listing detail subscribes on `auctions` + `bids` for that lot; the app also subscribes on **`auctions` globally** (`useAuctionCatalogRealtimeSync` in `app/_layout.tsx`) and invalidates catalog queries so home / explore / storefront cards update when prices change.
5. **Closing (scheduled)**: Edge **`close-expired-auctions`** must run on a **cron** (e.g. every 1–2 minutes). It calls SQL **`close_expired_auctions()`**, which moves past-`ends_at` **active** lots to **`ended`** (no bids) or **`awaiting_winner_consent`** (has bids), notifies the **high bidder** (`winner_consent_requested`) and the **seller** (`auction_pending_winner_consent` — awaiting winner consent; **do not** call the bidder until **`winner_consented`** / payment stage). Then **`process-notifications`** marks outbox rows processed and sends **SMS** (if MsgOwl REST is configured) and optionally **email** (if `NOTIFICATION_EMAIL_ENABLED=true`).

## Status model

`draft` → `pending_approval` → (`awaiting_payment` for featured fee path) → **`active`** (UI: **Live**) → after the close job: **`ended`** (no bids) or **`awaiting_winner_consent`** → **`payment_stage`** (after **`winner_give_consent`**) → **`completed`** / **`cancelled`** (legacy **`won`** / **`paid`** may still appear in RPCs and older rows).

## TypeScript types from Supabase (optional)

After schema changes, you can regenerate typed table definitions:

```bash
npx supabase gen types typescript --local > src/types/supabase.gen.ts
# Hosted:
# npx supabase gen types typescript --project-id <project-ref> > src/types/supabase.gen.ts
```

To use them, pass the `Database` generic into `createClient` in `src/lib/supabase.ts` (see Supabase docs).

## ES Neelan / Stitch design (MCP)

The app uses ES Neelan–aligned tokens in `src/theme/tokens.ts`. To pull **Google Stitch** screen specs through Cursor, enable the **Stitch** MCP server in Cursor Settings; if the server is in an error state, build from existing `src/components/ui/*` until MCP is healthy.

## Supabase + GitHub

The `supabase/` folder is meant to be pushed to GitHub and linked from the Supabase Dashboard (**Integrations → GitHub**). Use **working directory `.`** (repo root). Migrations may run via the integration; **Edge Functions** often need an explicit **`npm run supabase:functions`** (after `supabase link`) unless your integration deploys them on merge — see [`supabase/README.md`](supabase/README.md).

Official: [GitHub integration](https://supabase.com/docs/guides/deployment/branching/github-integration).

## License

See [LICENSE](LICENSE).
