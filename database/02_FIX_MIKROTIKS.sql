-- ============================================================
-- FIX MIKROTIKS TABLE - ADD NAME COLUMN
-- Run this SECOND in Supabase SQL Editor
-- ============================================================

BEGIN;

-- Add name column to mikrotiks
ALTER TABLE mikrotiks 
ADD COLUMN IF NOT EXISTS name TEXT;

-- Update existing records to have name from router_id
UPDATE mikrotiks 
SET name = COALESCE(name, router_id, 'Unknown Router')
WHERE name IS NULL;

-- Make name NOT NULL after populating
ALTER TABLE mikrotiks 
ALTER COLUMN name SET NOT NULL;

-- Add index on name
CREATE INDEX IF NOT EXISTS idx_mikrotiks_name 
ON mikrotiks(name);

COMMIT;

-- Verify
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'mikrotiks'
  AND column_name IN ('name', 'router_id', 'admin_id')
ORDER BY column_name;

SELECT '✅ MIKROTIKS TABLE FIXED!' as status;
