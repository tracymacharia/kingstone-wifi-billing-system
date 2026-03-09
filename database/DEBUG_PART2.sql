-- ============================================
-- DEBUG Part 2: Check Owner-Admin Relationships
-- ============================================

-- Check 1: Does the owner exist?
SELECT 
  'Owner exists' as check_type,
  id,
  profile_id,
  business_name,
  subscription_status
FROM owners
WHERE id = '1a9af26c-029e-4975-83bc-e0d8ee24c492';

-- Check 2: Are there any admins for this owner?
SELECT 
  'Admins for owner' as check_type,
  a.id,
  a.username,
  a.email,
  a.owner_id,
  a.subscription_status
FROM admins a
WHERE a.owner_id = '1a9af26c-029e-4975-83bc-e0d8ee24c492';

-- Check 3: Get current active session for this owner
SELECT 
  'Active session' as check_type,
  us.session_token,
  us.role,
  us.expires_at,
  us.is_active,
  sc.username as credential_username,
  sc.owner_id as cred_owner_id
FROM user_sessions us
JOIN system_credentials sc ON us.credential_id = sc.id
WHERE sc.owner_id = '1a9af26c-029e-4975-83bc-e0d8ee24c492'
  AND us.expires_at > NOW()
  AND us.is_active = TRUE;

-- Check 4: Test the get_owner_admins function manually
-- First, get a session token from Check 3 above, then uncomment and replace YOUR_TOKEN_HERE
-- SELECT * FROM get_owner_admins('YOUR_TOKEN_HERE');

-- Check 5: Count admins by owner
SELECT 
  o.id as owner_id,
  o.business_name,
  COUNT(a.id) as admin_count
FROM owners o
LEFT JOIN admins a ON o.id = a.owner_id
GROUP BY o.id, o.business_name;
