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
