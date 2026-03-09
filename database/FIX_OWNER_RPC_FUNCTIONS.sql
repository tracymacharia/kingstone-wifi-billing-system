-- ============================================
-- FIX: Updated RPC Functions with Better Error Handling
-- Run this to replace the existing functions
-- ============================================

-- Drop and recreate get_owner_admins with simpler logic
DROP FUNCTION IF EXISTS get_owner_admins(TEXT);

CREATE OR REPLACE FUNCTION get_owner_admins(p_session_token TEXT)
RETURNS TABLE (
  id UUID,
  username TEXT,
  email TEXT,
  phone TEXT,
  business_name TEXT,
  created_at TIMESTAMPTZ,
  must_change_password BOOLEAN,
  is_trial BOOLEAN,
  trial_expires_at TIMESTAMPTZ,
  trial_activated_at TIMESTAMPTZ,
  subscription_status TEXT,
  subscription_type TEXT,
  subscription_expires_at TIMESTAMPTZ,
  earnings_total DECIMAL
) AS $$
DECLARE
  v_owner_id UUID;
BEGIN
  -- First get the owner_id from the session
  SELECT o.id INTO v_owner_id
  FROM user_sessions us
  JOIN system_credentials sc ON us.credential_id = sc.id
  JOIN owners o ON sc.owner_id = o.id
  WHERE us.session_token = p_session_token
    AND us.expires_at > NOW()
    AND us.is_active = TRUE
    AND us.role = 'owner';
  
  -- Check if we found a valid owner
  IF v_owner_id IS NULL THEN
    RAISE EXCEPTION 'Invalid or expired owner session token';
  END IF;
  
  -- Now get all admins for this owner
  RETURN QUERY
  SELECT
    a.id,
    a.username,
    a.email,
    a.phone,
    a.business_name,
    a.created_at,
    a.must_change_password,
    a.is_trial,
    a.trial_expires_at,
    a.trial_activated_at,
    a.subscription_status,
    'hotspot' as subscription_type,
    a.trial_expires_at as subscription_expires_at,
    COALESCE(
      (SELECT SUM(p.amount) FROM payments p WHERE p.admin_id = a.id AND p.status = 'completed'),
      0
    ) as earnings_total
  FROM admins a
  WHERE a.owner_id = v_owner_id
  ORDER BY a.created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop and recreate get_owner_mikrotiks with simpler logic
DROP FUNCTION IF EXISTS get_owner_mikrotiks(TEXT);

CREATE OR REPLACE FUNCTION get_owner_mikrotiks(p_session_token TEXT)
RETURNS TABLE (
  id UUID,
  name TEXT,
  router_id TEXT,
  ip_address TEXT,
  api_port INTEGER,
  username TEXT,
  password_encrypted TEXT,
  admin_id UUID,
  status TEXT,
  mpesa_type TEXT,
  mpesa_number TEXT,
  location TEXT,
  created_at TIMESTAMPTZ
) AS $$
DECLARE
  v_owner_id UUID;
BEGIN
  -- First get the owner_id from the session
  SELECT o.id INTO v_owner_id
  FROM user_sessions us
  JOIN system_credentials sc ON us.credential_id = sc.id
  JOIN owners o ON sc.owner_id = o.id
  WHERE us.session_token = p_session_token
    AND us.expires_at > NOW()
    AND us.is_active = TRUE
    AND us.role = 'owner';
  
  -- Check if we found a valid owner
  IF v_owner_id IS NULL THEN
    RAISE EXCEPTION 'Invalid or expired owner session token';
  END IF;
  
  -- Now get all mikrotiks for this owner
  RETURN QUERY
  SELECT
    m.id,
    m.name,
    m.router_id,
    m.ip_address,
    m.api_port,
    m.username,
    m.password_encrypted,
    m.admin_id,
    m.status,
    m.mpesa_type,
    m.mpesa_number,
    m.location,
    m.created_at
  FROM mikrotiks m
  WHERE m.owner_id = v_owner_id
  ORDER BY m.created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop and recreate get_owner_profile_by_session with better error handling
DROP FUNCTION IF EXISTS get_owner_profile_by_session(TEXT);

CREATE OR REPLACE FUNCTION get_owner_profile_by_session(p_session_token TEXT)
RETURNS TABLE (
  owner_id UUID,
  profile_id UUID,
  full_name TEXT,
  email TEXT,
  phone TEXT,
  business_name TEXT,
  subscription_status TEXT,
  is_trial BOOLEAN,
  trial_expires_at TIMESTAMPTZ,
  numeric_owner_id INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    o.id as owner_id,
    o.profile_id,
    p.full_name,
    p.email,
    p.phone,
    o.business_name,
    o.subscription_status,
    o.is_trial,
    o.trial_expires_at,
    ('x' || substr(o.id::text, 1, 8))::bit(32)::int as numeric_owner_id
  FROM user_sessions us
  JOIN system_credentials sc ON us.credential_id = sc.id
  JOIN owners o ON sc.owner_id = o.id
  JOIN profiles p ON o.profile_id = p.id
  WHERE us.session_token = p_session_token
    AND us.expires_at > NOW()
    AND us.is_active = TRUE
    AND us.role = 'owner';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION get_owner_admins IS 'Get all admins for the authenticated owner. Returns empty set if no admins exist.';
COMMENT ON FUNCTION get_owner_mikrotiks IS 'Get all mikrotiks for the authenticated owner. Returns empty set if no mikrotiks exist.';
COMMENT ON FUNCTION get_owner_profile_by_session IS 'Get owner profile by session token. Returns empty set if session is invalid.';
