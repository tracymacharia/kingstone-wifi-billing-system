-- ============================================================
-- KINGSTONE WIFI BILLING SYSTEM - SECURITY FIX
-- Apply this in Supabase Dashboard > SQL Editor
-- 
-- This fixes the critical security issue where RLS was fully
-- disabled on sensitive tables. The approach:
--   1. Auth tables (system_credentials, user_sessions): deny all
--      direct client access. All auth goes through SECURITY
--      DEFINER RPCs which bypass RLS.
--   2. Business tables (mikrotiks, packages, wifi_users, etc.):
--      restrict access using a helper function that reads the
--      custom session token from the request headers.
-- ============================================================

-- ============================================================
-- STEP 1: Re-enable RLS on all auth tables and lock them down
-- ============================================================

ALTER TABLE system_credentials ENABLE ROW LEVEL SECURITY;
ALTER TABLE owners ENABLE ROW LEVEL SECURITY;
ALTER TABLE admins ENABLE ROW LEVEL SECURITY;
ALTER TABLE registration_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE owner_subscription_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_sessions ENABLE ROW LEVEL SECURITY;

-- Drop any existing policies first
DROP POLICY IF EXISTS "deny_direct_credentials_access" ON system_credentials;
DROP POLICY IF EXISTS "deny_direct_sessions_access" ON user_sessions;
DROP POLICY IF EXISTS "deny_direct_owners_access" ON owners;
DROP POLICY IF EXISTS "deny_direct_admins_access" ON admins;
DROP POLICY IF EXISTS "allow_public_read_unused_codes" ON registration_codes;
DROP POLICY IF EXISTS "deny_subscription_settings_access" ON owner_subscription_settings;

-- system_credentials: No direct client access ever.
-- All authentication goes through verify_credentials_secure / verify_admin_simple RPCs.
CREATE POLICY "deny_direct_credentials_access"
  ON system_credentials
  FOR ALL
  USING (false);

-- user_sessions: No direct client access.
-- All session validation goes through validate_session RPC.
CREATE POLICY "deny_direct_sessions_access"
  ON user_sessions
  FOR ALL
  USING (false);

-- owners: No direct client access.
-- All owner data goes through get_owner_profile_by_session RPC.
CREATE POLICY "deny_direct_owners_access"
  ON owners
  FOR ALL
  USING (false);

-- admins: No direct client access.
-- All admin data goes through get_owner_admins RPC or get_admin_by_session.
CREATE POLICY "deny_direct_admins_access"
  ON admins
  FOR ALL
  USING (false);

-- registration_codes: Public can read unused codes (for validation at sign-up).
-- Owners manage their codes via RPCs.
CREATE POLICY "allow_public_read_unused_codes"
  ON registration_codes
  FOR SELECT
  USING (is_used = false);

CREATE POLICY "deny_code_mutations"
  ON registration_codes
  FOR ALL
  USING (false)
  WITH CHECK (false);

-- owner_subscription_settings: No direct client access.
CREATE POLICY "deny_subscription_settings_access"
  ON owner_subscription_settings
  FOR ALL
  USING (false);


-- ============================================================
-- STEP 2: Session validation helper function
-- This function validates a session token from request headers
-- and returns the admin_id. Used by business table RLS policies.
-- ============================================================

CREATE OR REPLACE FUNCTION get_session_admin_id()
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
DECLARE
  v_token text;
  v_admin_id uuid;
BEGIN
  -- Try to get session token from custom header
  v_token := current_setting('request.headers', true)::json->>'x-session-token';
  
  IF v_token IS NULL OR v_token = '' THEN
    RETURN NULL;
  END IF;
  
  -- Validate the session and get admin_id
  SELECT a.id INTO v_admin_id
  FROM user_sessions us
  JOIN admins a ON a.id = us.user_id
  WHERE us.session_token = v_token
    AND us.expires_at > NOW()
    AND us.is_active = true;
    
  RETURN v_admin_id;
EXCEPTION
  WHEN OTHERS THEN
    RETURN NULL;
END;
$$;

CREATE OR REPLACE FUNCTION get_session_owner_id()
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
DECLARE
  v_token text;
  v_owner_id uuid;
BEGIN
  v_token := current_setting('request.headers', true)::json->>'x-session-token';
  
  IF v_token IS NULL OR v_token = '' THEN
    RETURN NULL;
  END IF;
  
  SELECT o.id INTO v_owner_id
  FROM user_sessions us
  JOIN owners o ON o.id = us.user_id
  WHERE us.session_token = v_token
    AND us.expires_at > NOW()
    AND us.is_active = true;
    
  RETURN v_owner_id;
EXCEPTION
  WHEN OTHERS THEN
    RETURN NULL;
END;
$$;


-- ============================================================
-- STEP 3: Secure business tables with session-based RLS
-- ============================================================

-- NOTE: The frontend already sends the session token as the
-- X-Session-Token custom header (see client.ts customFetch).
-- The get_session_admin_id() function reads that header.

-- MIKROTIKS
ALTER TABLE mikrotiks ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "admins_own_mikrotiks" ON mikrotiks;
CREATE POLICY "admins_own_mikrotiks"
  ON mikrotiks
  FOR ALL
  USING (admin_id = get_session_admin_id());

-- PACKAGES
ALTER TABLE packages ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "admins_own_packages" ON packages;
CREATE POLICY "admins_own_packages"
  ON packages
  FOR ALL
  USING (admin_id = get_session_admin_id());

-- WIFI_USERS
ALTER TABLE wifi_users ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "admins_own_wifi_users" ON wifi_users;
CREATE POLICY "admins_own_wifi_users"
  ON wifi_users
  FOR ALL
  USING (admin_id = get_session_admin_id());

-- PAYMENTS
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "admins_own_payments" ON payments;
CREATE POLICY "admins_own_payments"
  ON payments
  FOR ALL
  USING (admin_id = get_session_admin_id());

-- VOUCHERS
ALTER TABLE vouchers ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "admins_own_vouchers" ON vouchers;
CREATE POLICY "admins_own_vouchers"
  ON vouchers
  FOR ALL
  USING (admin_id = get_session_admin_id());

-- CONNECTED_USERS
ALTER TABLE connected_users ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "admins_own_connected_users" ON connected_users;
CREATE POLICY "admins_own_connected_users"
  ON connected_users
  FOR ALL
  USING (admin_id = get_session_admin_id());

-- BROADBAND_USERS
ALTER TABLE broadband_users ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "admins_own_broadband_users" ON broadband_users;
CREATE POLICY "admins_own_broadband_users"
  ON broadband_users
  FOR ALL
  USING (admin_id = get_session_admin_id());


-- ============================================================
-- STEP 4: Public access for the hotspot payment portal
-- Customers need to read packages and mikrotik info to connect
-- ============================================================

-- Allow public read of active packages (for the payment portal)
DROP POLICY IF EXISTS "public_read_active_packages" ON packages;
CREATE POLICY "public_read_active_packages"
  ON packages
  FOR SELECT
  USING (is_active = true);

-- Allow public read of mikrotik info (for hotspot portal routing)
DROP POLICY IF EXISTS "public_read_mikrotiks" ON mikrotiks;
CREATE POLICY "public_read_mikrotiks"
  ON mikrotiks
  FOR SELECT
  USING (true);


-- ============================================================
-- STEP 5: Verify the setup
-- ============================================================

SELECT 
  schemaname,
  tablename,
  rowsecurity as rls_enabled
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename IN (
    'system_credentials', 'user_sessions', 'owners', 'admins',
    'mikrotiks', 'packages', 'wifi_users', 'payments', 'vouchers',
    'registration_codes', 'owner_subscription_settings'
  )
ORDER BY tablename;
