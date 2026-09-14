-- ============================================================
-- 0007 — shared rate-limit counters
-- ============================================================
-- The app limited AI calls with an in-process Map. On Vercel each
-- serverless instance keeps its own copy, so the effective limit was
-- (limit x number of live instances) — it multiplied exactly when
-- traffic grew enough to matter. Moving the counter into Postgres
-- gives every instance one shared view of it.
--
-- Written for the infrastructure already here; no extra service.
-- ============================================================

create table if not exists public.rate_limits (
  key        text        primary key,
  count      integer     not null default 0,
  reset_at   timestamptz not null
);

-- Only the service role touches this table: the counters are keyed by
-- user id, and no user has any business reading anyone's — including
-- their own, which they could otherwise watch to time their way around
-- the limit. RLS on with no policies denies everyone else outright.
alter table public.rate_limits enable row level security;

-- Supports pruning expired rows.
create index if not exists rate_limits_reset_at_idx
  on public.rate_limits (reset_at);

/*
 * Count one request against `p_key` and say whether it is allowed.
 *
 * INSERT .. ON CONFLICT DO UPDATE takes a row lock, so concurrent
 * requests for the same key serialise here instead of racing through a
 * read-modify-write the way the in-memory version did.
 */
create or replace function public.consume_rate_limit(
  p_key       text,
  p_limit     integer,
  p_window_ms bigint
)
returns table (allowed boolean, remaining integer, reset_at timestamptz)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_now    timestamptz := now();
  v_window interval    := make_interval(secs => p_window_ms / 1000.0);
  v_count  integer;
  v_reset  timestamptz;
begin
  insert into public.rate_limits as r (key, count, reset_at)
  values (p_key, 1, v_now + v_window)
  on conflict (key) do update
    -- A window that has already elapsed starts over at 1.
    set count    = case when r.reset_at <= v_now then 1 else r.count + 1 end,
        reset_at = case when r.reset_at <= v_now then v_now + v_window else r.reset_at end
  returning r.count, r.reset_at into v_count, v_reset;

  return query
    select v_count <= p_limit,
           greatest(0, p_limit - v_count),
           v_reset;
end;
$$;

/*
 * Delete counters whose window closed over a day ago.
 *
 * Nothing calls this automatically — the table only grows by one row per
 * active key, so it stays small. Schedule it with pg_cron if you'd
 * rather not think about it:
 *   select cron.schedule('prune-rate-limits', '0 4 * * *',
 *                        $$select public.prune_rate_limits()$$);
 */
create or replace function public.prune_rate_limits()
returns integer
language sql
security definer
set search_path = public
as $$
  with deleted as (
    delete from public.rate_limits
    where reset_at < now() - interval '1 day'
    returning 1
  )
  select count(*)::integer from deleted;
$$;
