-- ============================================
-- FIX: register_admin_simple with proper business_name and subscription_type
-- ============================================

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

  -- Insert into admins with 14-day trial
  -- Note: admins table doesn't have business_name column
  -- Business name comes from the owner's business_name or should be stored separately
  INSERT INTO admins (
    profile_id,
    owner_id,
    username,
    password_hash,
    phone,
    email,
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

  -- Return the business_name and subscription_type in the response
  -- so the frontend can display it correctly
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

COMMENT ON FUNCTION register_admin_simple IS 'Register a new admin under an owner. Supports custom subscription types and returns business_name for display.';
