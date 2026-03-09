-- ============================================
-- FIX: Update activate_admin_trial and add update_subscription_type
-- ============================================

-- Fix activate_admin_trial to properly handle the response
DROP FUNCTION IF EXISTS activate_admin_trial(TEXT, UUID, INTEGER);

CREATE OR REPLACE FUNCTION activate_admin_trial(
  p_session_token TEXT,
  p_admin_id UUID,
  p_trial_days INTEGER DEFAULT 14
)
RETURNS JSON AS $$
DECLARE
  v_owner_id UUID;
  v_trial_expires_at TIMESTAMPTZ;
BEGIN
  -- Verify owner session
  SELECT o.id INTO v_owner_id
  FROM user_sessions us
  JOIN system_credentials sc ON us.credential_id = sc.id
  JOIN owners o ON sc.owner_id = o.id
  WHERE us.session_token = p_session_token
    AND us.expires_at > NOW()
    AND us.is_active = TRUE
    AND us.role = 'owner';

  IF v_owner_id IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Invalid or expired session');
  END IF;

  -- Verify admin belongs to this owner
  IF NOT EXISTS (SELECT 1 FROM admins WHERE id = p_admin_id AND owner_id = v_owner_id) THEN
    RETURN json_build_object('success', false, 'error', 'Admin not found or access denied');
  END IF;

  -- Calculate trial expiry
  v_trial_expires_at := NOW() + (p_trial_days || ' days')::interval;

  -- Update admin subscription
  UPDATE admins
  SET
    subscription_status = 'active',
    is_trial = TRUE,
    trial_expires_at = v_trial_expires_at,
    trial_activated_at = NOW(),
    updated_at = NOW()
  WHERE id = p_admin_id;

  RETURN json_build_object(
    'success', true,
    'message', 'Admin trial activated successfully',
    'trial_expires_at', v_trial_expires_at,
    'trial_days', p_trial_days
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add function to update admin subscription type
CREATE OR REPLACE FUNCTION owner_update_admin_subscription(
  p_session_token TEXT,
  p_admin_id UUID,
  p_subscription_type TEXT
)
RETURNS JSON AS $$
DECLARE
  v_owner_id UUID;
  v_subscription_type TEXT;
BEGIN
  -- Verify owner session
  SELECT o.id INTO v_owner_id
  FROM user_sessions us
  JOIN system_credentials sc ON us.credential_id = sc.id
  JOIN owners o ON sc.owner_id = o.id
  WHERE us.session_token = p_session_token
    AND us.expires_at > NOW()
    AND us.is_active = TRUE
    AND us.role = 'owner';

  IF v_owner_id IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Invalid or expired session');
  END IF;

  -- Verify admin belongs to this owner
  IF NOT EXISTS (SELECT 1 FROM admins WHERE id = p_admin_id AND owner_id = v_owner_id) THEN
    RETURN json_build_object('success', false, 'error', 'Admin not found or access denied');
  END IF;

  -- Validate subscription type
  v_subscription_type := LOWER(TRIM(p_subscription_type));
  IF v_subscription_type NOT IN ('hotspot', 'pppoe', 'static', 'ppoe_static', 'hotspot_pppoe', 'hotspot_static') THEN
    RETURN json_build_object('success', false, 'error', 'Invalid subscription type');
  END IF;

  -- Update subscription type
  UPDATE admins
  SET
    subscription_type = v_subscription_type,
    updated_at = NOW()
  WHERE id = p_admin_id;

  RETURN json_build_object(
    'success', true,
    'message', 'Subscription type updated successfully',
    'subscription_type', v_subscription_type
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION activate_admin_trial IS 'Activate admin trial subscription';
COMMENT ON FUNCTION owner_update_admin_subscription IS 'Update admin subscription type';

-- Verify functions exist
SELECT proname, oid::regprocedure as signature
FROM pg_proc
WHERE proname IN ('activate_admin_trial', 'owner_update_admin_subscription');
