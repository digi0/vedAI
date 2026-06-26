-- ============================================================
-- 0006 — atomic share-view counter increment
-- ============================================================
-- Replaces the read-modify-write pattern in bumpShareView()
-- with a single UPDATE that runs atomically inside Postgres,
-- preventing dropped counts under concurrent requests.
-- ============================================================

create or replace function public.increment_share_view(p_token text)
returns void
language sql
security definer
as $$
  update public.share_tokens
  set viewed_count = viewed_count + 1
  where token = p_token;
$$;
