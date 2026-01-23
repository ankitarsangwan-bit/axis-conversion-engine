-- Add mandatory columns to mis_records table for full persistence
ALTER TABLE public.mis_records 
ADD COLUMN IF NOT EXISTS name text,
ADD COLUMN IF NOT EXISTS card_type text,
ADD COLUMN IF NOT EXISTS ipa_status text,
ADD COLUMN IF NOT EXISTS dip_ok_status text,
ADD COLUMN IF NOT EXISTS ad_status text,
ADD COLUMN IF NOT EXISTS bank_event_date date,
ADD COLUMN IF NOT EXISTS etcc text,
ADD COLUMN IF NOT EXISTS existing_c text,
ADD COLUMN IF NOT EXISTS mis_month text,
ADD COLUMN IF NOT EXISTS vkyc_description text,
ADD COLUMN IF NOT EXISTS pincode text;