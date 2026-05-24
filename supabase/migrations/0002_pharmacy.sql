-- ============================================================
-- Ved AI — pharmacy schema
-- ============================================================
-- pharmacy_items: per-user catalog of meds the user can re-order.
--   Each row typically maps to an active prescription in `records`.
-- medication_orders: orders placed by the user. Line items are stored
--   inline as JSONB — orders are mostly append-only (status updates).
-- ============================================================

create type public.med_form as enum (
  'tablet', 'capsule', 'inhaler', 'injection', 'topical'
);

create type public.delivery_method as enum (
  'pickup', 'standard', 'express'
);

create type public.order_status as enum (
  'processing', 'shipped', 'delivered'
);

-- ---------- pharmacy_items ----------
create table public.pharmacy_items (
  id             uuid              primary key default gen_random_uuid(),
  user_id        uuid              not null,
  name           text              not null,
  dose           text              not null,
  form           public.med_form   not null,
  pack_size      text              not null,
  price          numeric(8,2)      not null,
  refills_left   int               not null default 0,
  prescribed_by  text,
  rx_record_id   uuid              references public.records(id) on delete set null,
  note           text,
  created_at     timestamptz       not null default now()
);

create index pharmacy_items_user_idx on public.pharmacy_items (user_id);

-- ---------- medication_orders ----------
create table public.medication_orders (
  id          text                   primary key,
  user_id     uuid                   not null,
  delivery    public.delivery_method not null,
  total       numeric(10,2)          not null,
  status      public.order_status    not null default 'processing',
  placed_at   timestamptz            not null default now(),
  items       jsonb                  not null  -- [{name, dose, qty, price}]
);

create index medication_orders_user_idx
  on public.medication_orders (user_id, placed_at desc);

-- ---------- RLS ----------
alter table public.pharmacy_items    enable row level security;
alter table public.medication_orders enable row level security;

create policy "pharmacy_items_owner_all" on public.pharmacy_items
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "medication_orders_owner_all" on public.medication_orders
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
