-- ============================================
-- Kingstone WiFi Billing System - Complete Owner Dashboard Setup
-- Run this ONCE in Supabase SQL Editor
-- This creates all missing tables and functions
-- ============================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- CREATE MISSING TABLES
-- ============================================

-- Registration Codes Table (for admin registration invitations)
CREATE TABLE IF NOT EXISTS registration_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL REFERENCES owners(id) ON DELETE CASCADE,
  code TEXT NOT NULL UNIQUE,
  business_name TEXT NOT NULL,
  subscription_type TEXT NOT NULL CHECK (subscription_type IN ('hotspot', 'pppoe', 'static', 'ppoe_static', 'hotspot_pppoe', 'hotspot_static')),
  is_used BOOLEAN DEFAULT FALSE,
  used_by UUID REFERENCES admins(id),
  expires_at TIMESTAMPTZ NOT NULL,
  revoked BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Owner Subscription Settings Table
CREATE TABLE IF NOT EXISTS owner_subscription_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL UNIQUE REFERENCES owners(id) ON DELETE CASCADE,
  hotspot_below_10000 DECIMAL(10,2) NOT NULL DEFAULT 500,
  hotspot_above_10000 DECIMAL(10,2) NOT NULL DEFAULT 1200,
  ppoe_static_price DECIMAL(10,2) NOT NULL DEFAULT 2500,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_registration_codes_owner ON registration_codes(owner_id);
CREATE INDEX IF NOT EXISTS idx_registration_codes_code ON registration_codes(code);
CREATE INDEX IF NOT EXISTS idx_registration_codes_expires ON registration_codes(expires_at);
CREATE INDEX IF NOT EXISTS idx_owner_subscription_settings_owner ON owner_subscription_settings(owner_id);

-- Enable RLS
ALTER TABLE registration_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE owner_subscription_settings ENABLE ROW LEVEL SECURITY;

-- ============================================
-- DROP EXISTING FUNCTIONS (to recreate with correct signatures)
-- ============================================

DROP FUNCTION IF EXISTS get_owner_profile_by_session(TEXT);
DROP FUNCTION IF EXISTS get_owner_admins(TEXT);
DROP FUNCTION IF EXISTS get_owner_mikrotiks(TEXT);
DROP FUNCTION IF EXISTS activate_admin_trial(UUID, INTEGER);
DROP FUNCTION IF EXISTS update_owner_subscription_settings(UUID, DECIMAL, DECIMAL, DECIMAL);
DROP FUNCTION IF EXISTS owner_create_mikrotik_for_admin(TEXT, UUID, TEXT, TEXT, TEXT, INTEGER, TEXT, TEXT, TEXT, TEXT, TEXT);
DROP FUNCTION IF EXISTS admin_delete_mikrotik(TEXT, UUID);
DROP FUNCTION IF EXISTS get_owner_subscription_settings(UUID);
DROP FUNCTION IF EXISTS create_registration_code(TEXT, TEXT, TEXT, INTEGER);
DROP FUNCTION IF EXISTS get_owner_registration_codes(TEXT);
DROP FUNCTION IF EXISTS revoke_registration_code(TEXT, UUID);
DROP FUNCTION IF EXISTS owner_reset_admin_password(TEXT, UUID, TEXT);
DROP FUNCTION IF EXISTS owner_delete_admin(TEXT, UUID);
DROP FUNCTION IF EXISTS owner_update_admin(TEXT, UUID, TEXT, TEXT, TEXT, TEXT);

-- ============================================
-- CREATE RPC FUNCTIONS
-- ============================================

-- 1. Get Owner Profile by Session Token
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

-- 2. Get All Admins for an Owner
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
BEGIN
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
  FROM user_sessions us
  JOIN system_credentials sc ON us.credential_id = sc.id
  JOIN owners o ON sc.owner_id = o.id
  JOIN admins a ON o.id = a.owner_id
  WHERE us.session_token = p_session_token
    AND us.expires_at > NOW()
    AND us.is_active = TRUE
    AND us.role = 'owner'
  ORDER BY a.created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Get All Mikrotiks for an Owner
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
BEGIN
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
  FROM user_sessions us
  JOIN system_credentials sc ON us.credential_id = sc.id
  JOIN owners o ON sc.owner_id = o.id
  JOIN mikrotiks m ON o.id = m.owner_id
  WHERE us.session_token = p_session_token
    AND us.expires_at > NOW()
    AND us.is_active = TRUE
    AND us.role = 'owner'
  ORDER BY m.created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Activate Admin Trial
CREATE OR REPLACE FUNCTION activate_admin_trial(
  p_admin_id UUID,
  p_trial_days INTEGER DEFAULT 14
)
RETURNS JSON AS $$
DECLARE
  v_admin admins%ROWTYPE;
  v_trial_expires_at TIMESTAMPTZ;
BEGIN
  SELECT * INTO v_admin FROM admins WHERE id = p_admin_id;

  IF v_admin.id IS NULL THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Admin not found'
    );
  END IF;

  v_trial_expires_at := NOW() + (p_trial_days || ' days')::interval;

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
    'trial_expires_at', v_trial_expires_at
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. Update Owner Subscription Settings
CREATE OR REPLACE FUNCTION update_owner_subscription_settings(
  p_owner_id UUID,
  p_hotspot_below_10000 DECIMAL,
  p_hotspot_above_10000 DECIMAL,
  p_ppoe_static_price DECIMAL
)
RETURNS JSON AS $$
DECLARE
  v_settings owner_subscription_settings%ROWTYPE;
BEGIN
  UPDATE owner_subscription_settings
  SET
    hotspot_below_10000 = p_hotspot_below_10000,
    hotspot_above_10000 = p_hotspot_above_10000,
    ppoe_static_price = p_ppoe_static_price,
    updated_at = NOW()
  WHERE owner_id = p_owner_id
  RETURNING * INTO v_settings;

  IF v_settings.id IS NULL THEN
    INSERT INTO owner_subscription_settings (
      owner_id,
      hotspot_below_10000,
      hotspot_above_10000,
      ppoe_static_price
    ) VALUES (
      p_owner_id,
      p_hotspot_below_10000,
      p_hotspot_above_10000,
      p_ppoe_static_price
    )
    RETURNING * INTO v_settings;
  END IF;

  RETURN json_build_object(
    'success', true,
    'settings', row_to_json(v_settings)
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. Get Owner Subscription Settings
CREATE OR REPLACE FUNCTION get_owner_subscription_settings(p_owner_id UUID)
RETURNS TABLE (
  id UUID,
  owner_id UUID,
  hotspot_below_10000 DECIMAL,
  hotspot_above_10000 DECIMAL,
  ppoe_static_price DECIMAL,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    oss.id,
    oss.owner_id,
    oss.hotspot_below_10000,
    oss.hotspot_above_10000,
    oss.ppoe_static_price,
    oss.created_at,
    oss.updated_at
  FROM owner_subscription_settings oss
  WHERE oss.owner_id = p_owner_id;
  
  IF NOT FOUND THEN
    RETURN QUERY
    SELECT
      NULL::UUID,
      p_owner_id,
      500::DECIMAL,
      1200::DECIMAL,
      2500::DECIMAL,
      NOW(),
      NOW();
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 7. Owner Create Mikrotik for Admin
CREATE OR REPLACE FUNCTION owner_create_mikrotik_for_admin(
  p_session_token TEXT,
  p_admin_id UUID,
  p_name TEXT,
  p_router_id TEXT,
  p_ip_address TEXT DEFAULT NULL,
  p_api_port INTEGER DEFAULT 8728,
  p_username TEXT DEFAULT 'admin',
  p_password TEXT DEFAULT 'admin123',
  p_mpesa_paybill TEXT DEFAULT NULL,
  p_mpesa_till_number TEXT DEFAULT NULL,
  p_mpesa_number TEXT DEFAULT NULL
)
RETURNS JSON AS $$
DECLARE
  v_owner_id UUID;
  v_mikrotik_id UUID;
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
    RETURN json_build_object(
      'success', false,
      'error', 'Invalid or expired session'
    );
  END IF;

  INSERT INTO mikrotiks (
    owner_id,
    admin_id,
    name,
    router_id,
    ip_address,
    api_port,
    username,
    password_encrypted,
    mpesa_type,
    mpesa_number,
    status
  ) VALUES (
    v_owner_id,
    p_admin_id,
    p_name,
    p_router_id,
    p_ip_address,
    p_api_port,
    p_username,
    p_password,
    CASE WHEN p_mpesa_paybill IS NOT NULL THEN 'paybill' ELSE 'till' END,
    COALESCE(p_mpesa_till_number, p_mpesa_number),
    'offline'
  )
  RETURNING id INTO v_mikrotik_id;

  RETURN json_build_object(
    'success', true,
    'mikrotik_id', v_mikrotik_id,
    'message', 'Mikrotik created successfully'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 8. Admin Delete Mikrotik
CREATE OR REPLACE FUNCTION admin_delete_mikrotik(
  p_session_token TEXT,
  p_mikrotik_id UUID
)
RETURNS JSON AS $$
DECLARE
  v_admin_id UUID;
  v_mikrotik mikrotiks%ROWTYPE;
BEGIN
  SELECT a.id INTO v_admin_id
  FROM user_sessions us
  JOIN system_credentials sc ON us.credential_id = sc.id
  JOIN admins a ON sc.admin_id = a.id
  WHERE us.session_token = p_session_token
    AND us.expires_at > NOW()
    AND us.is_active = TRUE
    AND us.role = 'admin';

  IF v_admin_id IS NULL THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Invalid or expired session'
    );
  END IF;

  SELECT * INTO v_mikrotik
  FROM mikrotiks
  WHERE id = p_mikrotik_id AND admin_id = v_admin_id;

  IF v_mikrotik.id IS NULL THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Mikrotik not found or access denied'
    );
  END IF;

  DELETE FROM mikrotiks WHERE id = p_mikrotik_id;

  RETURN json_build_object(
    'success', true,
    'message', 'Mikrotik deleted successfully'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 9. Create Registration Code
CREATE OR REPLACE FUNCTION create_registration_code(
  p_session_token TEXT,
  p_business_name TEXT,
  p_subscription_type TEXT,
  p_expiry_days INTEGER DEFAULT 7
)
RETURNS JSON AS $$
DECLARE
  v_owner_id UUID;
  v_code TEXT;
  v_expires_at TIMESTAMPTZ;
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
    RETURN json_build_object(
      'success', false,
      'error', 'Invalid or expired session'
    );
  END IF;

  v_code := UPPER(encode(gen_random_bytes(8), 'hex'));
  v_expires_at := NOW() + (p_expiry_days || ' days')::interval;

  INSERT INTO registration_codes (
    owner_id,
    code,
    business_name,
    subscription_type,
    expires_at,
    is_used,
    revoked
  ) VALUES (
    v_owner_id,
    v_code,
    p_business_name,
    p_subscription_type,
    v_expires_at,
    FALSE,
    FALSE
  );

  RETURN json_build_object(
    'success', true,
    'code', v_code,
    'expires_at', v_expires_at
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 10. Get Owner Registration Codes
CREATE OR REPLACE FUNCTION get_owner_registration_codes(p_session_token TEXT)
RETURNS TABLE (
  id UUID,
  code TEXT,
  business_name TEXT,
  subscription_type TEXT,
  is_used BOOLEAN,
  used_by UUID,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    rc.id,
    rc.code,
    rc.business_name,
    rc.subscription_type,
    rc.is_used,
    rc.used_by,
    rc.expires_at,
    rc.created_at
  FROM user_sessions us
  JOIN system_credentials sc ON us.credential_id = sc.id
  JOIN owners o ON sc.owner_id = o.id
  JOIN registration_codes rc ON o.id = rc.owner_id
  WHERE us.session_token = p_session_token
    AND us.expires_at > NOW()
    AND us.is_active = TRUE
    AND us.role = 'owner'
  ORDER BY rc.created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 11. Revoke Registration Code
CREATE OR REPLACE FUNCTION revoke_registration_code(
  p_session_token TEXT,
  p_code_id UUID
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
    RETURN json_build_object(
      'success', false,
      'error', 'Invalid or expired session'
    );
  END IF;

  UPDATE registration_codes
  SET revoked = TRUE
  WHERE id = p_code_id AND owner_id = v_owner_id AND is_used = FALSE;

  IF NOT FOUND THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Code not found or already used'
    );
  END IF;

  RETURN json_build_object(
    'success', true,
    'message', 'Registration code revoked'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 12. Owner Reset Admin Password
CREATE OR REPLACE FUNCTION owner_reset_admin_password(
  p_session_token TEXT,
  p_admin_id UUID,
  p_new_password TEXT
)
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
    RETURN json_build_object(
      'success', false,
      'error', 'Invalid or expired session'
    );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM admins WHERE id = p_admin_id AND owner_id = v_owner_id
  ) THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Admin not found or access denied'
    );
  END IF;

  v_password_hash := crypt(p_new_password, gen_salt('bf', 12));

  UPDATE admins
  SET
    password_hash = v_password_hash,
    must_change_password = TRUE,
    updated_at = NOW()
  WHERE id = p_admin_id;

  UPDATE system_credentials
  SET
    password_hash = v_password_hash,
    must_change_password = TRUE,
    updated_at = NOW()
  WHERE admin_id = p_admin_id AND role = 'admin';

  RETURN json_build_object(
    'success', true,
    'message', 'Admin password reset successfully'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 13. Owner Delete Admin
CREATE OR REPLACE FUNCTION owner_delete_admin(
  p_session_token TEXT,
  p_admin_id UUID
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
    RETURN json_build_object(
      'success', false,
      'error', 'Invalid or expired session'
    );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM admins WHERE id = p_admin_id AND owner_id = v_owner_id
  ) THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Admin not found or access denied'
    );
  END IF;

  DELETE FROM admins WHERE id = p_admin_id AND owner_id = v_owner_id;
  DELETE FROM system_credentials WHERE admin_id = p_admin_id AND role = 'admin';

  RETURN json_build_object(
    'success', true,
    'message', 'Admin deleted successfully'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 14. Owner Update Admin
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
    RETURN json_build_object(
      'success', false,
      'error', 'Invalid or expired session'
    );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM admins WHERE id = p_admin_id AND owner_id = v_owner_id
  ) THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Admin not found or access denied'
    );
  END IF;

  UPDATE admins
  SET
    username = p_username,
    email = p_email,
    phone = p_phone,
    business_name = p_business_name,
    updated_at = NOW()
  WHERE id = p_admin_id AND owner_id = v_owner_id;

  UPDATE system_credentials
  SET
    username = p_username,
    recovery_email = p_email,
    recovery_phone = p_phone,
    updated_at = NOW()
  WHERE admin_id = p_admin_id AND role = 'admin';

  RETURN json_build_object(
    'success', true,
    'message', 'Admin updated successfully'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- SETUP COMPLETE
-- ============================================
