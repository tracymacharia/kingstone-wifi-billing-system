-- ============================================
-- FIX: RLS Policy Infinite Recursion
-- The system_credentials table has policies causing infinite recursion
-- ============================================

-- First, let's see the current policies
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE tablename = 'system_credentials';

-- Drop the problematic policies
DROP POLICY IF EXISTS "Users can read own credentials" ON system_credentials;
DROP POLICY IF EXISTS "System can manage credentials" ON system_credentials;
DROP POLICY IF EXISTS "Owners can read their credentials" ON system_credentials;
DROP POLICY IF EXISTS "Admins can read their credentials" ON system_credentials;

-- Create simpler policies that don't cause recursion
-- Allow authenticated users to read their own credentials
CREATE POLICY "Allow users to read own credentials" ON system_credentials
  FOR SELECT
  USING (
    id IN (
      SELECT credential_id 
      FROM user_sessions 
      WHERE session_token = current_setting('request.header.x-session-token', TRUE)
        AND expires_at > NOW()
        AND is_active = TRUE
    )
    OR
    (role = 'owner' AND owner_id IN (
      SELECT o.id FROM owners o
      JOIN system_credentials sc ON o.id = sc.owner_id
      JOIN user_sessions us ON sc.credential_id = us.credential_id
      WHERE us.session_token = current_setting('request.header.x-session-token', TRUE)
        AND us.expires_at > NOW()
        AND us.is_active = TRUE
        AND us.role = 'owner'
    ))
    OR
    (role = 'admin' AND admin_id IN (
      SELECT a.id FROM admins a
      JOIN system_credentials sc ON a.id = sc.admin_id
      JOIN user_sessions us ON sc.credential_id = us.credential_id
      WHERE us.session_token = current_setting('request.header.x-session-token', TRUE)
        AND us.expires_at > NOW()
        AND us.is_active = TRUE
        AND us.role = 'admin'
    ))
  );

-- Allow insert/update/delete for authenticated sessions
CREATE POLICY "Allow session-based management" ON system_credentials
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM user_sessions
      WHERE expires_at > NOW()
        AND is_active = TRUE
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_sessions
      WHERE expires_at > NOW()
        AND is_active = TRUE
    )
  );

-- Also fix RLS on owners table if needed
DROP POLICY IF EXISTS "Owners can read own owner record" ON owners;
DROP POLICY IF EXISTS "Admins can read their owner record" ON owners;

CREATE POLICY "Allow owners to read via session" ON owners
  FOR SELECT
  USING (
    id IN (
      SELECT sc.owner_id
      FROM system_credentials sc
      JOIN user_sessions us ON sc.credential_id = us.credential_id
      WHERE us.session_token = current_setting('request.header.x-session-token', TRUE)
        AND us.expires_at > NOW()
        AND us.is_active = TRUE
        AND us.role = 'owner'
    )
    OR
    id IN (
      SELECT a.owner_id
      FROM admins a
      JOIN system_credentials sc ON a.id = sc.admin_id
      JOIN user_sessions us ON sc.credential_id = us.credential_id
      WHERE us.session_token = current_setting('request.header.x-session-token', TRUE)
        AND us.expires_at > NOW()
        AND us.is_active = TRUE
        AND us.role = 'admin'
    )
  );

-- Fix RLS on admins table
DROP POLICY IF EXISTS "Admins can read own admin record" ON admins;
DROP POLICY IF EXISTS "Owners can read their admins" ON admins;

CREATE POLICY "Allow admin read via session" ON admins
  FOR SELECT
  USING (
    id IN (
      SELECT sc.admin_id
      FROM system_credentials sc
      JOIN user_sessions us ON sc.credential_id = us.credential_id
      WHERE us.session_token = current_setting('request.header.x-session-token', TRUE)
        AND us.expires_at > NOW()
        AND us.is_active = TRUE
        AND us.role = 'admin'
    )
  );

CREATE POLICY "Allow owner to read admins" ON admins
  FOR SELECT
  USING (
    owner_id IN (
      SELECT sc.owner_id
      FROM system_credentials sc
      JOIN user_sessions us ON sc.credential_id = us.credential_id
      WHERE us.session_token = current_setting('request.header.x-session-token', TRUE)
        AND us.expires_at > NOW()
        AND us.is_active = TRUE
        AND us.role = 'owner'
    )
  );

-- Fix RLS on registration_codes table
DROP POLICY IF EXISTS "Owners can manage their registration codes" ON registration_codes;
DROP POLICY IF EXISTS "Public can read unused registration codes" ON registration_codes;

CREATE POLICY "Allow owners to manage registration codes" ON registration_codes
  FOR ALL
  USING (
    owner_id IN (
      SELECT sc.owner_id
      FROM system_credentials sc
      JOIN user_sessions us ON sc.credential_id = us.credential_id
      WHERE us.session_token = current_setting('request.header.x-session-token', TRUE)
        AND us.expires_at > NOW()
        AND us.is_active = TRUE
        AND us.role = 'owner'
    )
  );

-- Fix RLS on owner_subscription_settings table
DROP POLICY IF EXISTS "Owners can manage their subscription settings" ON owner_subscription_settings;

CREATE POLICY "Allow owners to manage subscription settings" ON owner_subscription_settings
  FOR ALL
  USING (
    owner_id IN (
      SELECT sc.owner_id
      FROM system_credentials sc
      JOIN user_sessions us ON sc.credential_id = us.credential_id
      WHERE us.session_token = current_setting('request.header.x-session-token', TRUE)
        AND us.expires_at > NOW()
        AND us.is_active = TRUE
        AND us.role = 'owner'
    )
  );

-- Verify the new policies
SELECT 
  tablename,
  policyname,
  cmd
FROM pg_policies
WHERE tablename IN ('system_credentials', 'owners', 'admins', 'registration_codes', 'owner_subscription_settings')
ORDER BY tablename, policyname;
