-- ============================================
-- FIX: Add business_name to admins table
-- This allows each admin to have their own business name
-- ============================================

-- Add business_name column to admins table if it doesn't exist
ALTER TABLE admins 
ADD COLUMN IF NOT EXISTS business_name TEXT;

-- Update the get_owner_admins function to return admin's business_name
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
  -- Use admin's business_name if available, otherwise use owner's business_name as fallback
  RETURN QUERY
  SELECT
    a.id,
    a.username,
    a.email,
    a.phone,
    COALESCE(a.business_name, o.business_name) as business_name,
    a.created_at,
    a.must_change_password,
    a.is_trial,
    a.trial_expires_at,
    a.trial_activated_at,
    a.subscription_status,
    'hotspot' as subscription_type, -- Default, can be updated later
    a.trial_expires_at as subscription_expires_at,
    COALESCE(
      (SELECT SUM(p.amount) FROM payments p WHERE p.admin_id = a.id AND p.status = 'completed'),
      0
    ) as earnings_total
  FROM admins a
  JOIN owners o ON a.owner_id = o.id
  WHERE a.owner_id = v_owner_id
  ORDER BY a.created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update register_admin_simple to store business_name
DROP FUNCTION IF EXISTS register_admin_simple(TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, UUID);

CREATE OR REPLACE FUNCTION register_admin_simple(
  p_session_token TEXT,
  p_full_name TEXT,
  p_phone TEXT,
  p_email TEXT,
  p_business_name TEXT,
  p_username TEXT,
  p_password TEXT,
  p_subscription_type TEXT DEFAULT 'hotspot',
  p_owner_id UUID DEFAULT NULL
)
RETURNS JSON AS $$
DECLARE
  v_owner_id UUID;
  v_profile_id UUID;
  v_admin_id UUID;
  v_password_hash TEXT;
  v_subscription_type TEXT;
BEGIN
  -- Verify owner session and get owner_id
  SELECT o.id INTO v_owner_id
  FROM user_sessions us
  JOIN system_credentials sc ON us.credential_id = sc.id
  JOIN owners o ON sc.owner_id = o.id
  WHERE us.session_token = p_session_token
    AND us.expires_at > NOW()
    AND us.is_active = TRUE
    AND us.role = 'owner';

  -- Use provided owner_id if session lookup failed
  IF v_owner_id IS NULL AND p_owner_id IS NOT NULL THEN
    v_owner_id := p_owner_id;
  END IF;

  IF v_owner_id IS NULL THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Invalid or expired owner session'
    );
  END IF;

  -- Validate and set subscription type
  v_subscription_type := LOWER(TRIM(COALESCE(p_subscription_type, 'hotspot')));
  IF v_subscription_type NOT IN ('hotspot', 'pppoe', 'static', 'ppoe_static', 'hotspot_pppoe', 'hotspot_static') THEN
    v_subscription_type := 'hotspot';
  END IF;

  -- Generate secure password hash
  v_password_hash := crypt(p_password, gen_salt('bf', 12));

  -- Insert into profiles
  INSERT INTO profiles (full_name, email, phone, role)
  VALUES (p_full_name, p_email, p_phone, 'admin')
  RETURNING id INTO v_profile_id;

  -- Insert into admins with business_name and 14-day trial
  INSERT INTO admins (
    profile_id,
    owner_id,
    username,
    password_hash,
    phone,
    email,
    business_name,
    is_trial,
    trial_expires_at,
    trial_activated_at,
    subscription_status
  ) VALUES (
    v_profile_id,
    v_owner_id,
    p_username,
    v_password_hash,
    p_phone,
    p_email,
    p_business_name, -- Store the business name!
    TRUE,
    NOW() + INTERVAL '14 days',
    NOW(),
    'trial'
  )
  RETURNING id INTO v_admin_id;

  -- Insert into system_credentials
  INSERT INTO system_credentials (
    username,
    password_hash,
    role,
    admin_id,
    must_change_password
  ) VALUES (
    p_username,
    v_password_hash,
    'admin',
    v_admin_id,
    TRUE
  );

  RETURN json_build_object(
    'success', true,
    'admin_id', v_admin_id,
    'profile_id', v_profile_id,
    'message', 'Admin registered successfully',
    'is_new', true,
    'subscription_status', 'trial',
    'subscription_type', v_subscription_type,
    'business_name', p_business_name
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION register_admin_simple IS 'Register a new admin with business_name and subscription_type support.';
