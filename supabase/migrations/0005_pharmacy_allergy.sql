-- ============================================================
-- Ved AI — pharmacy allergy cross-check
-- ============================================================
-- Adds an allergy_class hint to each pharmacy item so the UI can
-- block ordering when it matches an entry in profiles.allergies.
-- Seeds one Amoxicillin row to demonstrate the Penicillin block
-- against the default profile's allergy list.
-- ============================================================

alter table public.pharmacy_items
  add column if not exists allergy_class text;

-- Demo seed (idempotent): Amoxicillin is in the penicillin class.
insert into public.pharmacy_items
  (user_id, name, dose, form, pack_size, price, refills_left,
   prescribed_by, note, allergy_class)
select
  '00000000-0000-0000-0000-000000000001'::uuid,
  'Amoxicillin',
  '500mg',
  'capsule'::public.med_form,
  '21 capsules / course',
  9,
  1,
  'Dr. M. Chen (urgent care)',
  'Prescribed during sinus infection visit, Feb 2026.',
  'Penicillin'
where not exists (
  select 1 from public.pharmacy_items
  where user_id = '00000000-0000-0000-0000-000000000001'::uuid
    and name = 'Amoxicillin'
    and dose = '500mg'
);
