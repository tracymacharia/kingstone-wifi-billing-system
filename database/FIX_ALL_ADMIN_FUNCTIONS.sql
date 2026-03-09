-- ============================================
-- FIX: Drop all versions of functions first, then recreate
-- ============================================

-- Find and drop all versions by searching pg_proc
DO $$
DECLARE
    func_record RECORD;
BEGIN
    -- Drop all versions of activate_admin_trial
    FOR func_record IN 
        SELECT oid::regprocedure as func_name
        FROM pg_proc
        WHERE proname = 'activate_admin_trial'
    LOOP
        EXECUTE format('DROP FUNCTION IF EXISTS %s CASCADE', func_record.func_name);
        RAISE NOTICE 'Dropped function: %', func_record.func_name;
    END LOOP;
    
    -- Drop other functions
    DROP FUNCTION IF EXISTS owner_update_admin(TEXT, UUID, TEXT, TEXT, TEXT, TEXT) CASCADE;
    DROP FUNCTION IF EXISTS owner_delete_admin(TEXT, UUID) CASCADE;
    DROP FUNCTION IF EXISTS owner_reset_admin_password(TEXT, UUID, TEXT) CASCADE;
END $$;

-- Now create the functions fresh

-- 1. Update Admin
CREATE OR REPLACE FUNCTION owner_update_admin(
  p_session_token TEXT,
  p_admin_id UUID,
  p_username TEXT,
  p_email TEXT,
  p_phone TEXT,
  p_business_name TEXT
)
RETURNS JSON AS $$
DECLARE
  v_owner_id UUID;
BEGIN
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

  IF NOT EXISTS (SELECT 1 FROM admins WHERE id = p_admin_id AND owner_id = v_owner_id) THEN
    RETURN json_build_object('success', false, 'error', 'Admin not found or access denied');
  END IF;

  UPDATE admins
  SET username = p_username, email = p_email, phone = p_phone, business_name = p_business_name, updated_at = NOW()
  WHERE id = p_admin_id AND owner_id = v_owner_id;

  UPDATE system_credentials
  SET username = p_username, recovery_email = p_email, recovery_phone = p_phone, updated_at = NOW()
  WHERE admin_id = p_admin_id AND role = 'admin';

  RETURN json_build_object('success', true, 'message', 'Admin updated successfully');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Delete Admin
CREATE OR REPLACE FUNCTION owner_delete_admin(p_session_token TEXT, p_admin_id UUID)
RETURNS JSON AS $$
DECLARE
  v_owner_id UUID;
BEGIN
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

  IF NOT EXISTS (SELECT 1 FROM admins WHERE id = p_admin_id AND owner_id = v_owner_id) THEN
    RETURN json_build_object('success', false, 'error', 'Admin not found or access denied');
  END IF;

  DELETE FROM admins WHERE id = p_admin_id AND owner_id = v_owner_id;
  DELETE FROM system_credentials WHERE admin_id = p_admin_id AND role = 'admin';

  RETURN json_build_object('success', true, 'message', 'Admin deleted successfully');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Reset Admin Password
CREATE OR REPLACE FUNCTION owner_reset_admin_password(p_session_token TEXT, p_admin_id UUID, p_new_password TEXT)
RETURNS JSON AS $$
DECLARE
  v_owner_id UUID;
  v_password_hash TEXT;
BEGIN
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

  IF NOT EXISTS (SELECT 1 FROM admins WHERE id = p_admin_id AND owner_id = v_owner_id) THEN
    RETURN json_build_object('success', false, 'error', 'Admin not found or access denied');
  END IF;

  v_password_hash := crypt(p_new_password, gen_salt('bf', 12));

  UPDATE admins
  SET password_hash = v_password_hash, must_change_password = TRUE, updated_at = NOW()
  WHERE id = p_admin_id;

  UPDATE system_credentials
  SET password_hash = v_password_hash, must_change_password = TRUE, updated_at = NOW()
  WHERE admin_id = p_admin_id AND role = 'admin';

  RETURN json_build_object('success', true, 'message', 'Admin password reset successfully', 'temporary_password', p_new_password);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Activate Admin Trial
CREATE OR REPLACE FUNCTION activate_admin_trial(p_session_token TEXT, p_admin_id UUID, p_trial_days INTEGER DEFAULT 14)
RETURNS JSON AS $$
DECLARE
  v_owner_id UUID;
  v_trial_expires_at TIMESTAMPTZ;
BEGIN
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

  IF NOT EXISTS (SELECT 1 FROM admins WHERE id = p_admin_id AND owner_id = v_owner_id) THEN
    RETURN json_build_object('success', false, 'error', 'Admin not found or access denied');
  END IF;

  v_trial_expires_at := NOW() + (p_trial_days || ' days')::interval;

  UPDATE admins
  SET subscription_status = 'active', is_trial = TRUE, trial_expires_at = v_trial_expires_at, trial_activated_at = NOW(), updated_at = NOW()
  WHERE id = p_admin_id;

  RETURN json_build_object('success', true, 'message', 'Admin trial activated successfully', 'trial_expires_at', v_trial_expires_at);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Verify functions were created
SELECT proname as function_name, oid::regprocedure as signature
FROM pg_proc
WHERE proname IN ('owner_update_admin', 'owner_delete_admin', 'owner_reset_admin_password', 'activate_admin_trial')
ORDER BY proname;
