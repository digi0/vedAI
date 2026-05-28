-- ============================================================
-- 0004 — expand metric_key enum with common lab markers
-- ============================================================
-- Adds keys for the lab values most consistently present in
-- standard lipid / metabolic / thyroid / vitamin panels. Lets
-- the upload pipeline auto-populate metrics_readings from the
-- parsed lab values on every record upload, so the metrics
-- charts actually fill in over time.
-- ============================================================

alter type public.metric_key add value if not exists 'hba1c';
alter type public.metric_key add value if not exists 'ldl';
alter type public.metric_key add value if not exists 'hdl';
alter type public.metric_key add value if not exists 'triglycerides';
alter type public.metric_key add value if not exists 'total_chol';
alter type public.metric_key add value if not exists 'vitamin_d';
alter type public.metric_key add value if not exists 'vitamin_b12';
alter type public.metric_key add value if not exists 'creatinine';
alter type public.metric_key add value if not exists 'alt';
alter type public.metric_key add value if not exists 'ast';
alter type public.metric_key add value if not exists 'tsh';
