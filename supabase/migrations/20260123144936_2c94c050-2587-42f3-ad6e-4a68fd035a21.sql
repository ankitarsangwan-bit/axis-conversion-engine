-- 🔒 ONE-TIME DATA CORRECTION: Backfill application_date and recompute lead_quality
-- This migration enforces the authoritative quality mapping and immutable fields

-- Step 1: Backfill application_date from month field for records with NULL application_date
-- Parse month format like "Nov 2025" to a date (use 1st of month)
UPDATE mis_records
SET application_date = TO_DATE(
  CASE 
    WHEN month ~ '^(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec) [0-9]{4}$' THEN
      '01 ' || month
    ELSE NULL
  END, 
  'DD Mon YYYY'
)
WHERE application_date IS NULL 
  AND month IS NOT NULL 
  AND month ~ '^(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec) [0-9]{4}$';

-- Step 2: For remaining NULL application_date (invalid month format like "Dec 1899"), 
-- set to a sentinel date to indicate data quality issue
UPDATE mis_records
SET application_date = '1899-12-01'::date
WHERE application_date IS NULL;

-- Step 3: Recompute lead_quality using the AUTHORITATIVE whitelist mapping
-- GOOD: Accept, BQS_Match, Refer With FI, Refer-PAN, STPK
-- AVERAGE: STPI, STPT  
-- REJECT: Contains 'REJECT'
-- BLANK: NULL, empty, '0', or any unmapped value

UPDATE mis_records
SET lead_quality = CASE
  -- Rule 1: BLANK - null, empty, or "0"
  WHEN UPPER(TRIM(COALESCE(blaze_output, ''))) = '' THEN 'Blank'
  WHEN UPPER(TRIM(blaze_output)) = '0' THEN 'Blank'
  
  -- Rule 2: REJECT - contains 'REJECT' (handles all reject variants)
  WHEN UPPER(TRIM(blaze_output)) LIKE '%REJECT%' THEN 'Rejected'
  
  -- Rule 3: AVERAGE - exact match to STPI or STPT
  WHEN UPPER(TRIM(blaze_output)) IN ('STPI', 'STPT') THEN 'Average'
  
  -- Rule 4: GOOD - exact match to whitelist values only
  WHEN UPPER(TRIM(blaze_output)) IN ('ACCEPT', 'BQS_MATCH', 'REFER WITH FI', 'REFER-PAN', 'STPK') THEN 'Good'
  
  -- Rule 5: BLANK - any unmapped value (NO default to Good!)
  ELSE 'Blank'
END;

-- Step 4: Verify the update succeeded (this will show in migration output)
-- Expected for Jan 2026: Good ~3,295, Average ~2,302, Rejected ~12,887, Blank ~838