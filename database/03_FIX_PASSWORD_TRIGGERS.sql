-- ============================================================
-- FIX PASSWORD TRIGGERS - HANDLE UPDATES
-- Run this THIRD in Supabase SQL Editor
-- ============================================================

BEGIN;

-- Create trigger for password updates
DROP TRIGGER IF EXISTS trigger_hash_password_update ON system_credentials;
CREATE TRIGGER trigger_hash_password_update
BEFORE UPDATE ON system_credentials
FOR EACH ROW
WHEN (NEW.password_hash IS DISTINCT FROM OLD.password_hash)
EXECUTE FUNCTION hash_password_on_insert();

COMMIT;

-- Verify trigger
SELECT trigger_name, event_manipulation, event_object_table
FROM information_schema.triggers
WHERE event_object_table = 'system_credentials';

SELECT '✅ PASSWORD TRIGGERS FIXED!' as status;
