-- Fix unit default from 'g' to 'mg'
-- The schema incorrectly defaulted to grams instead of milligrams.
-- This is safety-critical: 'g' vs 'mg' is a 1000x difference.

ALTER TABLE dose_logs ALTER COLUMN unit SET DEFAULT 'mg';

-- Correct any existing rows that inherited the wrong default.
-- Only update rows where unit is exactly 'g' (the old default).
UPDATE dose_logs SET unit = 'mg' WHERE unit = 'g';
