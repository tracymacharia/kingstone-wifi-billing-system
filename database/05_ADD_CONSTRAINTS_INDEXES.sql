-- ============================================================
-- ADD UNIQUE CONSTRAINTS AND PERFORMANCE INDEXES
-- Run this FIFTH in Supabase SQL Editor
-- ============================================================

BEGIN;

-- Add unique constraint on wifi_users username
ALTER TABLE wifi_users 
ADD CONSTRAINT wifi_users_username_key 
UNIQUE (username);

-- Add unique constraint on broadband_users username
ALTER TABLE broadband_users 
ADD CONSTRAINT broadband_users_username_key 
UNIQUE (username);

-- Add index on status columns for better query performance
CREATE INDEX IF NOT EXISTS idx_wifi_users_active 
ON wifi_users(is_active);

CREATE INDEX IF NOT EXISTS idx_broadband_users_active 
ON broadband_users(is_active);

CREATE INDEX IF NOT EXISTS idx_packages_active 
ON packages(is_active);

CREATE INDEX IF NOT EXISTS idx_packages_type 
ON packages(package_type);

CREATE INDEX IF NOT EXISTS idx_payments_status 
ON payments(status);

-- Add index on mikrotik status
CREATE INDEX IF NOT EXISTS idx_mikrotiks_status 
ON mikrotiks(status);

-- Add index on credentials for active users
CREATE INDEX IF NOT EXISTS idx_credentials_active 
ON system_credentials(is_active);

COMMIT;

-- Verify constraints
SELECT conname, contype, conrelid::regclass
FROM pg_constraint
WHERE conrelid IN (
  'wifi_users'::regclass,
  'broadband_users'::regclass
)
AND contype = 'u';

-- Verify indexes
SELECT indexname, tablename
FROM pg_indexes
WHERE schemaname = 'public'
  AND tablename IN (
    'wifi_users',
    'broadband_users',
    'packages',
    'payments',
    'mikrotiks',
    'system_credentials'
  )
ORDER BY tablename, indexname;

SELECT '✅ CONSTRAINTS AND INDEXES ADDED!' as status;
