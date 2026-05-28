-- ============================================================
-- 0003 — clean slate + parsed_data + insights table
-- ============================================================
-- Drops all demo-seeded rows so the app starts empty. Adds a
-- parsed_data column on records (populated by medical-parser on
-- upload) and a new insights table that stores LLM-generated
-- insights instead of regenerating them on every render.
-- ============================================================

-- 1. wipe all demo data
truncate table public.medication_orders, public.pharmacy_items,
              public.share_tokens, public.metrics_readings,
              public.records, public.profiles
        restart identity;

-- 2. parsed_data on records
alter table public.records
  add column if not exists parsed_data jsonb,
  add column if not exists parse_status text not null default 'pending'
    check (parse_status in ('pending', 'parsed', 'failed', 'manual'));

create index if not exists records_parse_status_idx
  on public.records (parse_status);

-- 3. insights table — persisted between regenerations
create table if not exists public.insights (
  id           uuid        primary key default gen_random_uuid(),
  user_id      uuid        not null,
  severity     text        not null check (severity in ('info', 'watch', 'alert')),
  title        text        not null,
  detail       text        not null,
  suggestion   text        not null,
  generated_at timestamptz not null default now()
);

create index if not exists insights_user_idx
  on public.insights (user_id, generated_at desc);

alter table public.insights enable row level security;

drop policy if exists "insights_owner_all" on public.insights;
create policy "insights_owner_all" on public.insights
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
