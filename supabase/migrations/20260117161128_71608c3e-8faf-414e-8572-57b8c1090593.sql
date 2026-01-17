-- Add text columns for raw MIS data fields
ALTER TABLE public.mis_records
ADD COLUMN IF NOT EXISTS blaze_output text,
ADD COLUMN IF NOT EXISTS login_status text,
ADD COLUMN IF NOT EXISTS final_status text,
ADD COLUMN IF NOT EXISTS vkyc_status text,
ADD COLUMN IF NOT EXISTS core_non_core text,
ADD COLUMN IF NOT EXISTS vkyc_eligible text,
ADD COLUMN IF NOT EXISTS lead_quality text,
ADD COLUMN IF NOT EXISTS kyc_completed boolean DEFAULT false;