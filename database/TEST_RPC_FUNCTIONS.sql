-- ============================================
-- TEST SCRIPT - Run this to verify RPC functions exist
-- Copy and paste this into Supabase SQL Editor
-- ============================================

-- Check if functions exist
SELECT 
  proname as function_name,
  prosrc as source_code
FROM pg_proc 
WHERE proname IN (
  'get_owner_profile_by_session',
  'get_owner_admins', 
  'get_owner_mikrotiks',
  'activate_admin_trial',
  'update_owner_subscription_settings',
  'owner_create_mikrotik_for_admin',
  'admin_delete_mikrotik'
);

-- Test get_owner_profile_by_session with a sample token
-- Replace 'your-session-token-here' with an actual session token from sessionStorage
-- SELECT * FROM get_owner_profile_by_session('your-session-token-here');

-- Check if tables exist
SELECT 
  tablename,
  schemaname
FROM pg_tables 
WHERE tablename IN (
  'registration_codes',
  'owner_subscription_settings',
  'user_sessions',
  'system_credentials',
  'owners',
  'admins',
  'mikrotiks'
);

-- Show current sessions (to find a valid token)
SELECT 
  id,
  credential_id,
  session_token,
  role,
  expires_at,
  is_active
FROM user_sessions 
WHERE expires_at > NOW()
ORDER BY created_at DESC
LIMIT 5;
