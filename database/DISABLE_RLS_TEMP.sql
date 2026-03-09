-- ============================================
-- SIMPLE FIX: Disable RLS temporarily for development
-- This removes the recursion issue completely
-- For production, you'll want to implement proper RLS
-- ============================================

-- Disable RLS on these tables temporarily (development only!)
ALTER TABLE system_credentials DISABLE ROW LEVEL SECURITY;
ALTER TABLE owners DISABLE ROW LEVEL SECURITY;
ALTER TABLE admins DISABLE ROW LEVEL SECURITY;
ALTER TABLE registration_codes DISABLE ROW LEVEL SECURITY;
ALTER TABLE owner_subscription_settings DISABLE ROW LEVEL SECURITY;
ALTER TABLE user_sessions DISABLE ROW LEVEL SECURITY;

-- Verify RLS is disabled
SELECT 
  relname as table_name,
  relrowsecurity as rls_enabled
FROM pg_class
WHERE relname IN ('system_credentials', 'owners', 'admins', 'registration_codes', 'owner_subscription_settings', 'user_sessions');

-- Note: This is for DEVELOPMENT only!
-- For production, you should re-enable RLS with proper policies:
-- ALTER TABLE system_credentials ENABLE ROW LEVEL SECURITY;
-- etc.
