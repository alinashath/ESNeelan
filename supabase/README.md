# Supabase directory (Git + Dashboard)

This folder is intended to be **committed and pushed** to GitHub so you can use **Supabase Branching / GitHub integration**.

Official guide: [GitHub integration](https://supabase.com/docs/guides/deployment/branching/github-integration)

## What to commit

Track everything here **except** what `supabase/.gitignore` already excludes (local `.temp`, `.branches`, dotenv keys):

- `config.toml` — project config; per-function entries under `[functions.*]` control Edge Function deploys when you use **Deploy to production** / preview branches.
- `migrations/` — applied automatically on preview/production per integration settings.
- `seed.sql` — used for local `supabase db reset` and preview seeding (not merged to prod data by default).
- `functions/` — Edge Function source (`sms-hook`, `promote-admin`, `process-notifications`, `close-expired-auctions`).

Do **not** commit real API keys or `SUPABASE_SERVICE_ROLE_KEY`; set those as **secrets** in the Supabase Dashboard (or GitHub Actions), not in this repo.

## Connect the repo in Supabase Dashboard

1. **Project Settings** → **Integrations** → **GitHub** → **Authorize GitHub** and pick this repository.
2. **Working directory**: use **`.`** because `supabase/` sits at the **repository root** (same level as `app/`). If you ever move it (e.g. `apps/mobile/supabase/`), set the working directory to that parent path instead.
3. Turn on **Automatic branching** / **Deploy to production** as needed so pushes or merges run migrations and deploy Edge Functions declared in `config.toml`.

## First-time push checklist

```bash
git add supabase/
git status   # confirm migrations + functions + config + seed.sql are staged
git commit -m "Add Supabase migrations and Edge Functions"
git push origin <your-branch>
```

Then finish wiring the integration in the Dashboard. Optional: add a **required status check** for the Supabase preview job so bad migrations cannot merge ([same doc — Preventing migration failures](https://supabase.com/docs/guides/deployment/branching/github-integration)).

## If tables are not created on the hosted project

Linking GitHub **does not** apply SQL until a **preview branch** is created or **Deploy to production** runs on a merge (depending on your integration settings). An empty project stays empty until migrations succeed.

### A. Apply migrations from your machine (most reliable)

```bash
cd /path/to/ESNeelan
supabase login
supabase link --project-ref <YOUR_PROJECT_REF>   # Dashboard → Project Settings → General
supabase db push                                  # applies supabase/migrations to linked remote
```

Use **Dashboard → Database → Migrations** (or the branching job log) to confirm each file ran. If a migration failed earlier, fix the SQL, then either run `supabase db push` again (only pending migrations) or use **Database → Reset** on a disposable preview branch (never reset production casually).

### B. GitHub integration checklist

- **Working directory** is **`.`** (repo root contains `supabase/`).
- `supabase/migrations/*.sql` are **committed and pushed** to the branch Supabase watches.
- **Deploy to production** (or preview) is enabled so a merge/push actually runs migrations.
- Open the **Supabase check / PR comment** on GitHub for the migration log if something fails.

### C. One-shot failure: whole file rolls back

Each migration file runs in a **single transaction**. If the last statement in a file errors, **none** of that file’s changes stay. We wrap fragile steps (e.g. Realtime publication) so a benign “already in publication” error does not roll back the rest of the schema.

---

## Edge Functions (DB deployed, functions not yet)

Migrations and Edge Functions are **separate deploy steps** unless your [GitHub integration](https://supabase.com/docs/guides/deployment/branching/github-integration) is configured so a production merge deploys **both** (migrations + functions from `config.toml`). If only the database updated, deploy functions manually:

### 1. Link (once per machine)

```bash
supabase login
supabase link --project-ref <YOUR_PROJECT_REF>
```

### 2. Deploy all project functions

From the **repository root** (where `supabase/` lives):

```bash
npm run supabase:functions
```

Or run individually:

```bash
supabase functions deploy sms-hook
supabase functions deploy promote-admin
supabase functions deploy process-notifications
supabase functions deploy close-expired-auctions
```

`verify_jwt` for each function is read from [`config.toml`](config.toml) (`[functions.*]` blocks).

### 3. Set secrets (Dashboard or CLI)

Functions need runtime secrets, e.g.:

| Function | Typical secrets |
|----------|-------------------|
| `sms-hook` | `SEND_SMS_HOOK_SECRET` (must match **Authentication → Hooks → Send SMS** hook secret), `MSGOWL_ACCESS_KEY`, `MSGOWL_SENDER_ID`. For local `supabase start`, you can use `SMS_HOOK_SECRET` instead if you align it with `[auth.hook.send_sms]` in `config.toml`. |
| `promote-admin` | `ADMIN_PHONES` (`SUPABASE_*` keys are usually injected automatically on deploy — confirm under **Edge Functions → Secrets**) |
| `process-notifications` | Optional `RESEND_API_KEY`, `NOTIFY_FROM_EMAIL` for email; DB access uses injected service credentials when available |
| `close-expired-auctions` | Same; schedule this function (e.g. cron) after deploy |

### Phone OTP: “Unsupported phone provider”

Supabase returns this when **Phone** sign-in is enabled but there is **no SMS delivery path** (no Twilio/MessageBird/etc. and no working **Send SMS** hook).

1. **Dashboard → Authentication → Providers → Phone** — turn **Phone** on and save.
2. **Deploy** `sms-hook` (`npm run supabase:functions` or `supabase functions deploy sms-hook`).
3. **Dashboard → Authentication → Hooks → Send SMS** — set **Hook URL** to  
   `https://<YOUR_PROJECT_REF>.supabase.co/functions/v1/sms-hook`  
   and generate/copy the **hook secret**. Put the **same** value in **Edge Functions → Secrets** as `SEND_SMS_HOOK_SECRET` for `sms-hook`.
4. The hook receives a [Standard Webhooks](https://github.com/standard-webhooks/standard-webhooks)-signed body; `sms-hook` verifies it with `standardwebhooks` when `SEND_SMS_HOOK_SECRET` (or `SMS_HOOK_SECRET`) is set.

Local dev: `[auth.hook.send_sms]` in [`config.toml`](config.toml) points at `sms-hook`; set `SMS_HOOK_SECRET` in the env file your CLI loads for `supabase start`, and ensure the function can verify the same value (via `SMS_HOOK_SECRET` or `SEND_SMS_HOOK_SECRET`).

**Dashboard:** Project → **Edge Functions** → **Manage secrets**  
**CLI:** `supabase secrets set KEY=value` (run for each key)

### 4. GitHub-only deploy later

When **Deploy to production** is enabled on the integration, a merge to your production branch should deploy functions listed under `[functions.*]` in `config.toml`. If functions still lag, run `npm run supabase:functions` once after linking, or add a small GitHub Action that calls `supabase functions deploy` with a CI access token.

