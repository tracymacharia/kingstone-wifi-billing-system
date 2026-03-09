-- ============================================
-- FIX: Corrected get_owner_admins function
-- The admins table doesn't have business_name column
-- ============================================

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
  -- Note: business_name comes from owners table, not admins
  RETURN QUERY
  SELECT
    a.id,
    a.username,
    a.email,
    a.phone,
    o.business_name::TEXT, -- Get business_name from owners table
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
  JOIN owners o ON a.owner_id = o.id
  WHERE a.owner_id = v_owner_id
  ORDER BY a.created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION get_owner_admins IS 'Get all admins for the authenticated owner. business_name is taken from the owner''s business_name.';
