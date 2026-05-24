-- ============================================================
-- Ved AI — initial schema
-- ============================================================
-- Notes:
--  * Every user-owned row carries `user_id uuid` (no FK yet — see below).
--  * RLS is enabled and policies check `auth.uid() = user_id`, so they
--    start enforcing ownership the moment auth is wired up. No further
--    migration needed for that.
--  * The FK from user_id to auth.users is intentionally OMITTED during
--    the demo phase so we can insert rows under a synthetic DEMO_USER_ID
--    without creating a real auth user. A follow-up migration will add
--    the FK once auth lands.
--  * In the demo phase, server code uses the service_role key (which
--    bypasses RLS) with DEMO_USER_ID. The browser anon client will
--    correctly return zero rows because auth.uid() is null.
-- ============================================================

create extension if not exists "pgcrypto";

-- ---------- profiles ----------
-- One row per user. Holds the emergency card data.
create table public.profiles (
  user_id            uuid        primary key,
  full_name          text        not null default '',
  dob                date,
  blood_type         text,
  allergies          text[]      not null default '{}',
  conditions         text[]      not null default '{}',
  medications        jsonb       not null default '[]'::jsonb,
  emergency_contacts jsonb       not null default '[]'::jsonb,
  insurance          jsonb,
  primary_doctor     jsonb,
  updated_at         timestamptz not null default now()
);

-- ---------- records ----------
create type public.record_type as enum (
  'lab', 'prescription', 'imaging', 'visit', 'vaccination'
);

create table public.records (
  id          uuid               primary key default gen_random_uuid(),
  user_id     uuid               not null,
  type        public.record_type not null,
  title       text               not null,
  doctor      text,
  facility    text,
  record_date date               not null,
  summary     text,
  file_path   text,
  tags        text[]             not null default '{}',
  created_at  timestamptz        not null default now()
);

create index records_user_date_idx on public.records (user_id, record_date desc);

-- ---------- metrics_readings ----------
create type public.metric_key as enum (
  'bp_sys', 'bp_dia', 'weight', 'glucose', 'resting_hr', 'sleep_hrs'
);

create table public.metrics_readings (
  id        uuid              primary key default gen_random_uuid(),
  user_id   uuid              not null,
  key       public.metric_key not null,
  value     numeric           not null,
  taken_at  timestamptz       not null default now(),
  note      text
);

create index metrics_user_key_taken_idx
  on public.metrics_readings (user_id, key, taken_at desc);

-- ---------- share_tokens ----------
-- Tokenized read-only links handed to a doctor.
create table public.share_tokens (
  token             text        primary key,
  user_id           uuid        not null,
  expires_at        timestamptz not null,
  created_at        timestamptz not null default now(),
  revoked_at        timestamptz,
  include_records   boolean     not null default true,
  include_metrics   boolean     not null default true,
  include_profile   boolean     not null default true,
  viewed_count      int         not null default 0
);

create index share_tokens_user_idx on public.share_tokens (user_id);

-- ============================================================
-- RLS — auth.uid() based; works the moment auth is wired up.
-- During the demo phase, server uses service_role key which bypasses RLS.
-- ============================================================
alter table public.profiles         enable row level security;
alter table public.records          enable row level security;
alter table public.metrics_readings enable row level security;
alter table public.share_tokens     enable row level security;

create policy "profiles_owner_all" on public.profiles
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "records_owner_all" on public.records
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "metrics_owner_all" on public.metrics_readings
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "share_tokens_owner_all" on public.share_tokens
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
