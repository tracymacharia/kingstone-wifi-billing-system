-- ============================================
-- DEPRECATED: This file has been superseded
-- ============================================
-- This file is kept for reference only.
-- Please use OWNER_REGISTRATION_SETUP.sql for new installations.
-- 
-- The new implementation includes:
-- - OTP email verification
-- - Enhanced security with bcrypt (cost factor 12)
-- - Comprehensive input validation
-- - Row Level Security policies
-- - Trial period management
-- - Better error handling
-- ============================================

-- OLD FUNCTION - DO NOT USE IN PRODUCTION
-- See OWNER_REGISTRATION_SETUP.sql for the updated version
-- This version is kept for reference only

-- Function to register an owner (LEGACY - NO OTP)
CREATE OR REPLACE FUNCTION register_owner_legacy(
  p_full_name TEXT,
  p_email TEXT,
  p_phone_number TEXT,
  p_password TEXT
)
RETURNS JSON AS $$
DECLARE
  v_profile_id UUID;
  v_owner_id UUID;
  v_password_hash TEXT;
BEGIN
  -- Generate password hash
  v_password_hash := crypt(p_password, gen_salt('bf'));

  -- Insert into profiles
  INSERT INTO profiles (full_name, email, phone, role)
  VALUES (p_full_name, p_email, p_phone_number, 'owner')
  RETURNING id INTO v_profile_id;

  -- Insert into owners
  INSERT INTO owners (profile_id, business_name)
  VALUES (v_profile_id, p_full_name || '''s Business')
  RETURNING id INTO v_owner_id;

  -- Insert into system_credentials
  INSERT INTO system_credentials (username, password_hash, role, owner_id)
  VALUES (p_email, v_password_hash, 'owner', v_owner_id);

  -- Return success response
  RETURN json_build_object(
    'success', true,
    'owner_id', v_owner_id,
    'profile_id', v_profile_id,
    'message', 'Owner registered successfully'
  );
EXCEPTION
  WHEN unique_violation THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Email already exists'
    );
  WHEN OTHERS THEN
    RETURN json_build_object(
      'success', false,
      'error', SQLERRM
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check if owner exists
CREATE OR REPLACE FUNCTION owner_exists(p_email TEXT)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM system_credentials 
    WHERE username = p_email AND role = 'owner'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to register an admin
CREATE OR REPLACE FUNCTION register_admin(
  p_full_name TEXT,
  p_email TEXT,
  p_phone TEXT,
  p_business_name TEXT,
  p_username TEXT,
  p_password TEXT,
  p_owner_id UUID,
  p_subscription_type TEXT
)
RETURNS JSON AS $$
DECLARE
  v_profile_id UUID;
  v_admin_id UUID;
  v_password_hash TEXT;
BEGIN
  -- Generate password hash
  v_password_hash := crypt(p_password, gen_salt('bf'));
  
  -- Insert into profiles
  INSERT INTO profiles (full_name, email, phone, role)
  VALUES (p_full_name, p_email, p_phone, 'admin')
  RETURNING id INTO v_profile_id;
  
  -- Insert into admins
  INSERT INTO admins (profile_id, owner_id, username, password_hash, phone, email)
  VALUES (v_profile_id, p_owner_id, p_username, v_password_hash, p_phone, p_email)
  RETURNING id INTO v_admin_id;
  
  -- Update system_credentials
  INSERT INTO system_credentials (username, password_hash, role, admin_id)
  VALUES (p_username, v_password_hash, 'admin', v_admin_id);
  
  -- Return success response
  RETURN json_build_object(
    'success', true,
    'admin_id', v_admin_id,
    'message', 'Admin registered successfully'
  );
EXCEPTION
  WHEN unique_violation THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Username already exists'
    );
  WHEN OTHERS THEN
    RETURN json_build_object(
      'success', false,
      'error', SQLERRM
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- SETUP COMPLETE
-- ============================================
