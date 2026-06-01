# Ved AI — MVP deploy & handoff

A medical vault: records (auto-parsed), health metrics, AI insights,
doctor share links, emergency card, and pharmacy. Real per-user auth,
no mock data.

## Stack

- **Next.js 16** (App Router, Turbopack) + React 19
- **Supabase** — Postgres (RLS per-user), Auth (email+password), Storage
- **medical-parser** — deterministic PDF → structured JSON (vendored tarball)
- **LLM insights** — Claude in prod (`ANTHROPIC_API_KEY`), Ollama in dev

## Architecture notes

- **Auth**: `src/middleware.ts` guards every route. Logged-out users are
  redirected to `/login`, except the doctor share view `/share/<token>`
  which is public + token-gated.
- **Data isolation**: reads go through the cookie-bound Supabase client
  (`supabaseServer()`), so RLS (`auth.uid() = user_id`) enforces per-user
  access. Writes use the service-role client but always scope `user_id` to
  the verified session user (`requireUserId()`) — never trusted input.
- **Parser**: `medical-parser` is vendored at `vendor/medical-parser-0.1.0.tgz`
  and referenced via `file:vendor/...` so the Vercel build is self-contained
  (no sibling repo needed). To update it: rebuild + repack in `../medical-parser`,
  copy the new `.tgz` into `vendor/`, bump the version in both `package.json`s,
  `npm install`.
- **LLM switch**: `getLLM()` in `src/lib/llm.ts` returns the Anthropic provider
  when `ANTHROPIC_API_KEY` is set, else Ollama.

## Environment variables

| Var | Where | Notes |
|-----|-------|-------|
| `NEXT_PUBLIC_SUPABASE_URL` | all | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | all | public anon key |
| `SUPABASE_SERVICE_ROLE_KEY` | server | admin key — secret |
| `ANTHROPIC_API_KEY` | prod | enables Claude insights |
| `ANTHROPIC_MODEL` | optional | default `claude-3-5-haiku-latest` |
| `OLLAMA_URL` / `OLLAMA_MODEL` | local | only used when no Anthropic key |

## What YOU need to do

### 1. Supabase — Auth config (one-time)
Dashboard → **Authentication → Providers → Email**:
- **Turn OFF "Confirm email"** (instant signup for MVP). Otherwise new users
  must click an email link before they can sign in.

Dashboard → **Authentication → URL Configuration**:
- **Site URL**: your Vercel URL (e.g. `https://vedai.vercel.app`)
- **Redirect URLs**: add `https://vedai.vercel.app/**` and `http://localhost:3000/**`

### 2. Anthropic key
Get a key at console.anthropic.com → put it in Vercel env as `ANTHROPIC_API_KEY`.
(For local testing with Claude, add it to `.env.local`; otherwise local uses Ollama.)

### 3. Vercel
1. Push this branch to GitHub (see git note below).
2. Vercel → New Project → import the `vedAI` repo.
3. Framework preset: Next.js (auto-detected). Build command default.
4. Add all env vars from the table above.
5. Deploy. Then put the deployed URL back into Supabase Auth (step 1).

### 4. Storage bucket
Already created (`record-files`, private, 50 MB). Nothing to do unless you
recreate the project.

## Migrations (already applied to the live project)

```
0001_init                      profiles, records, metrics_readings, share_tokens + RLS
0002_pharmacy                  pharmacy_items, medication_orders + RLS
0003_clean_slate_and_parsed_data   parsed_data + parse_status, insights table
0004_expand_metric_keys        lab-marker metric keys
0005_pharmacy_allergy          allergy_class column
```

To recreate on a fresh project: apply them in order via the Supabase SQL
editor or CLI.

## Local development

```bash
npm install
# .env.local with the Supabase vars (Ollama optional for insights)
npm run dev    # http://localhost:3000
```

Sign up → upload a lab PDF → metrics auto-populate → Insights → Regenerate.

## Known gaps (polish candidates)

- Profile editing UI (currently auto-populated from uploads; no manual edit form yet).
- Parser supports one lab format (Smart Report 3.0) + a generic fallback.
- Pharmacy ordering/refills are simulated (no real fulfillment integration).
- Email confirmation + password reset flows are off/not built (MVP scope).
