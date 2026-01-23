-- 1) Add immutable event-time column from Axis MIS "DATE" (2nd column)
ALTER TABLE public.mis_records
ADD COLUMN IF NOT EXISTS application_date date;

-- 2) Enforce one row per application_id at the database level
-- (prevents any accidental append/duplicate writes)
CREATE UNIQUE INDEX IF NOT EXISTS mis_records_application_id_uidx
ON public.mis_records (application_id);

-- 3) Helpful index for month-based aggregation on event time
CREATE INDEX IF NOT EXISTS mis_records_application_date_idx
ON public.mis_records (application_date);
