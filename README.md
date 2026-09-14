# vedAI — Personal Medical Vault

A full-stack medical records application with AI-powered health insights, built with Next.js and Supabase.

**Live demo:** [ved-ai-smoky.vercel.app](https://ved-ai-smoky.vercel.app)

---

## Features

- **Medical Records** — Upload lab PDFs; they're automatically parsed into structured data
- **Health Metrics** — Auto-populated from uploaded reports; track readings over time
- **AI Insights** — Claude-powered (or local Ollama) analysis of your health data
- **Doctor Share Links** — Generate token-gated, public share URLs for specific records
- **Emergency Card** — Quick-access summary of critical health info
- **Profile** — Auto-seeded from your first upload, then editable at `/profile` (blood type, allergies, conditions, medications, contacts)
- **Pharmacy** — Medication list and order management (simulated fulfillment)
- **Per-user data isolation** — Row-level security via Supabase RLS; no data leakage between accounts

---

## Tech Stack

| Layer | Technology |
|-------|------------|
| Framework | Next.js 16 (App Router, Turbopack) + React 19 |
| Database / Auth / Storage | Supabase (Postgres + RLS, email auth, private buckets) |
| AI | Claude via Anthropic SDK (prod) · Ollama (local dev) |
| PDF Parsing | `medical-parser` (vendored, deterministic PDF → JSON) |
| Styling | Tailwind CSS v4 |
| Language | TypeScript |
| Deployment | Vercel |

---

## Getting Started

### Prerequisites

- Node.js 18+
- A [Supabase](https://supabase.com) project
- (Optional) [Ollama](https://ollama.com) running locally for AI insights in dev

### 1. Clone & install

```bash
git clone https://github.com/digi0/vedAI.git
cd vedAI
npm install
```

### 2. Configure environment

```bash
cp .env.local.example .env.local
```

Fill in your values:

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://YOUR-PROJECT-REF.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...

# AI — set one of these:
ANTHROPIC_API_KEY=        # uses Claude in prod
OLLAMA_URL=http://localhost:11434   # fallback for local dev
OLLAMA_MODEL=llama3:8b
```

### 3. Apply database migrations

Run these in order via the Supabase SQL editor or CLI:

```
0001_init                    profiles, records, metrics_readings, share_tokens + RLS
0002_pharmacy                pharmacy_items, medication_orders + RLS
0003_clean_slate_and_parsed_data   parsed_data, parse_status, insights table
0004_expand_metric_keys      lab-marker metric keys
0005_pharmacy_allergy        allergy_class column
0006_increment_share_view    atomic share-view counter (increment_share_view RPC)
0007_rate_limits             shared rate-limit counters (consume_rate_limit RPC)
```

All seven are required — `0006` creates the `increment_share_view` function that
the share-link view counter calls at runtime.

### 4. Run locally

```bash
npm run dev   # http://localhost:3000
```

Sign up → upload a lab PDF → metrics auto-populate → go to Insights → Regenerate.

### 5. Checks

```bash
npm run lint        # eslint
npm run typecheck   # tsc --noEmit
npm test            # vitest
```

All three run on every pull request via `.github/workflows/ci.yml`.

---

## Supabase Auth Configuration (one-time)

1. **Authentication → Providers → Email**: Turn off "Confirm email" for instant signup (MVP).
2. **Authentication → URL Configuration**:
   - Site URL: your deployed URL (e.g. `https://vedai.vercel.app`)
   - Redirect URLs: `https://vedai.vercel.app/**` and `http://localhost:3000/**`

   The wildcard covers `/auth/confirm`, where every emailed link lands.

### Password reset

`/forgot-password` mails a link that lands on `/auth/confirm`, which exchanges
the token for a session server-side and forwards to `/reset-password`.

The route accepts both link shapes, so the default **Reset Password** email
template works as-is. If you customise it, either form is fine:

```
{{ .ConfirmationURL }}
{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=recovery&next=/reset-password
```

---

## Deploying to Vercel

1. Push to GitHub and import the repo in Vercel.
2. Framework preset: **Next.js** (auto-detected).
3. Add all environment variables from the table in `.env.local.example`.
4. Deploy, then update your Supabase Auth URLs with the deployed domain.

---

## Architecture Notes

- **Auth guard**: `src/middleware.ts` redirects unauthenticated users to `/login`. The `/share/<token>` route is the only public route (token-gated for doctor sharing).
- **Data isolation**: All reads use the cookie-bound Supabase client with RLS (`auth.uid() = user_id`). Writes use the service-role client but always scope `user_id` to the verified session user via `requireUserId()`.
- **LLM switch**: `src/lib/llm.ts` → `getLLM()` returns the Anthropic provider when `ANTHROPIC_API_KEY` is set, otherwise falls back to Ollama.
- **Rate limiting**: AI endpoints go through `consumeRateLimit()` (`src/lib/rate-limit-store.ts`), which counts in Postgres so every serverless instance shares one counter. If that store is unreachable it falls back to the in-process limiter in `src/lib/rate-limit.ts` — a weaker limit, not no limit.
- **Vendored parser**: `medical-parser` is bundled as a tarball at `vendor/medical-parser-*.tgz` so Vercel builds are self-contained. To update: rebuild, repack, copy the new `.tgz` to `vendor/`, and bump versions in both `package.json` files.

---

## WhatsApp Ingestion (optional)

The app supports ingesting records via WhatsApp using the Meta Cloud API. Configure these additional env vars:

```env
WHATSAPP_VERIFY_TOKEN=
WHATSAPP_APP_SECRET=
WHATSAPP_ACCESS_TOKEN=
WHATSAPP_PHONE_NUMBER_ID=
NEXT_PUBLIC_WHATSAPP_NUMBER=
```

---

## Known Gaps / Roadmap

- Parser supports Smart Report 3.0 format + a generic fallback; more formats planned
- Pharmacy fulfillment is simulated (no real pharmacy integration)
- Email confirmation flow not yet built (password reset ships; see above)

---

## License

Private repository. All rights reserved.
