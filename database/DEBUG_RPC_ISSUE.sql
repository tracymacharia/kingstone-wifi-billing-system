-- ============================================
-- DEBUG: Test RPC Functions with Real Data
-- Run this in Supabase SQL Editor to diagnose the issue
-- ============================================

-- Step 1: Find a valid session token
SELECT 
  us.session_token,
  us.role,
  us.expires_at,
  us.is_active,
  sc.username,
  CASE WHEN us.role = 'owner' THEN o.id ELSE a.id END as user_id
FROM user_sessions us
JOIN system_credentials sc ON us.credential_id = sc.id
LEFT JOIN owners o ON sc.owner_id = o.id
LEFT JOIN admins a ON sc.admin_id = a.id
WHERE us.expires_at > NOW()
ORDER BY us.created_at DESC
LIMIT 5;

-- Step 2: Test get_owner_profile_by_session with a real token
-- REPLACE 'YOUR-TOKEN-HERE' with the session_token from Step 1
-- SELECT * FROM get_owner_profile_by_session('YOUR-TOKEN-HERE');

-- Step 3: Test get_owner_admins with a real token
-- REPLACE 'YOUR-TOKEN-HERE' with the session_token from Step 1
-- SELECT * FROM get_owner_admins('YOUR-TOKEN-HERE');

-- Step 4: Test get_owner_mikrotiks with a real token
-- REPLACE 'YOUR-TOKEN-HERE' with the session_token from Step 1
-- SELECT * FROM get_owner_mikrotiks('YOUR-TOKEN-HERE');

-- Step 5: Check if the owners table has data
SELECT 
  id,
  profile_id,
  business_name,
  subscription_status,
  is_trial,
  created_at
FROM owners
LIMIT 5;

-- Step 6: Check if admins exist and their owner_id
SELECT 
  a.id,
  a.username,
  a.owner_id,
  o.business_name as owner_business
FROM admins a
LEFT JOIN owners o ON a.owner_id = o.id
LIMIT 10;

-- Step 7: Check system_credentials structure
SELECT 
  id,
  username,
  role,
  owner_id,
  admin_id
FROM system_credentials
LIMIT 10;
