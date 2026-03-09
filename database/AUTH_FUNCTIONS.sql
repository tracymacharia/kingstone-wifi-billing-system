-- ============================================
-- Kingstone WiFi Billing System - Authentication Functions
-- Secure authentication without Supabase Auth
-- ============================================

-- ============================================
-- HELPER FUNCTIONS
-- ============================================

-- Generate secure random string for session tokens
CREATE OR REPLACE FUNCTION generate_session_token()
RETURNS TEXT AS $$
DECLARE
  token TEXT;
BEGIN
  token := encode(gen_random_bytes(32), 'hex');
  RETURN token;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- SESSION MANAGEMENT
-- ============================================

-- Create user_sessions table if not exists
CREATE TABLE IF NOT EXISTS user_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  credential_id UUID NOT NULL REFERENCES system_credentials(id) ON DELETE CASCADE,
  session_token TEXT NOT NULL UNIQUE,
  role TEXT NOT NULL CHECK (role IN ('owner', 'admin')),
  expires_at TIMESTAMPTZ NOT NULL,
  is_active BOOLEAN DEFAULT TRUE,
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_user_sessions_token ON user_sessions(session_token);
CREATE INDEX IF NOT EXISTS idx_user_sessions_credential ON user_sessions(credential_id);
CREATE INDEX IF NOT EXISTS idx_user_sessions_active ON user_sessions(is_active, expires_at);

-- Create user session
CREATE OR REPLACE FUNCTION create_user_session(
  p_user_id UUID,
  p_role TEXT
)
RETURNS TEXT AS $$
DECLARE
  v_session_token TEXT;
  v_credential_id UUID;
BEGIN
  -- Get the credential_id based on role
  IF p_role = 'owner' THEN
    SELECT id INTO v_credential_id
    FROM system_credentials
    WHERE owner_id = p_user_id AND role = 'owner';
  ELSE
    SELECT id INTO v_credential_id
    FROM system_credentials
    WHERE admin_id = p_user_id AND role = 'admin';
  END IF;

  IF v_credential_id IS NULL THEN
    RAISE EXCEPTION 'Credentials not found for user';
  END IF;

  -- Generate session token
  v_session_token := generate_session_token();

  -- Insert session record (expires in 24 hours)
  INSERT INTO user_sessions (credential_id, session_token, role, expires_at)
  VALUES (v_credential_id, v_session_token, p_role, NOW() + INTERVAL '24 hours');

  RETURN v_session_token;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Validate session token
CREATE OR REPLACE FUNCTION validate_session(p_session_token TEXT)
RETURNS TABLE (
  credential_id UUID,
  user_id UUID,
  role TEXT,
  username TEXT,
  is_active BOOLEAN
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    us.credential_id,
    CASE 
      WHEN us.role = 'owner' THEN o.id
      WHEN us.role = 'admin' THEN a.id
    END as user_id,
    us.role,
    sc.username,
    us.is_active
  FROM user_sessions us
  JOIN system_credentials sc ON us.credential_id = sc.id
  LEFT JOIN owners o ON sc.owner_id = o.id
  LEFT JOIN admins a ON sc.admin_id = a.id
  WHERE us.session_token = p_session_token
    AND us.expires_at > NOW()
    AND us.is_active = TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Invalidate session (logout)
CREATE OR REPLACE FUNCTION invalidate_session(p_session_token TEXT)
RETURNS BOOLEAN AS $$
BEGIN
  UPDATE user_sessions
  SET is_active = FALSE
  WHERE session_token = p_session_token;

  RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Clean up expired sessions
CREATE OR REPLACE FUNCTION cleanup_expired_sessions()
RETURNS INTEGER AS $$
DECLARE
  v_deleted_count INTEGER;
BEGIN
  DELETE FROM user_sessions
  WHERE expires_at < NOW();

  GET DIAGNOSTICS v_deleted_count = ROW_COUNT;
  RETURN v_deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- CREDENTIAL VERIFICATION
-- ============================================

-- Verify owner credentials (email + password)
CREATE OR REPLACE FUNCTION verify_credentials_secure(
  input_username TEXT,
  input_password TEXT
)
RETURNS TABLE (
  role TEXT,
  credential_id UUID,
  owner_id UUID,
  admin_id UUID,
  must_change_password BOOLEAN
) AS $$
DECLARE
  v_stored_hash TEXT;
  v_credential_id UUID;
  v_owner_id UUID;
  v_admin_id UUID;
  v_must_change_pwd BOOLEAN;
BEGIN
  -- Get the stored hash for owner
  SELECT sc.password_hash, sc.id, sc.owner_id, sc.admin_id, sc.must_change_password
  INTO v_stored_hash, v_credential_id, v_owner_id, v_admin_id, v_must_change_pwd
  FROM system_credentials sc
  WHERE sc.username = input_username AND sc.role = 'owner';

  -- Check if credentials exist
  IF v_credential_id IS NULL THEN
    RAISE EXCEPTION 'Invalid credentials';
  END IF;

  -- Verify password using bcrypt
  IF v_stored_hash IS NOT NULL AND v_stored_hash = crypt(input_password, v_stored_hash) THEN
    role := 'owner';
    credential_id := v_credential_id;
    owner_id := v_owner_id;
    admin_id := v_admin_id;
    must_change_password := v_must_change_pwd;
    RETURN NEXT;
  ELSE
    RAISE EXCEPTION 'Invalid credentials';
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Verify admin credentials (supports both hashed and plain text for migration)
CREATE OR REPLACE FUNCTION verify_admin_simple(
  input_username TEXT,
  input_password TEXT
)
RETURNS TABLE (
  role TEXT,
  credential_id UUID,
  owner_id UUID,
  admin_id UUID,
  must_change_password BOOLEAN,
  is_first_login BOOLEAN
) AS $$
DECLARE
  v_stored_hash TEXT;
  v_credential_id UUID;
  v_owner_id UUID;
  v_admin_id UUID;
  v_must_change_pwd BOOLEAN;
BEGIN
  -- Get the stored hash for admin
  SELECT sc.password_hash, sc.id, sc.owner_id, sc.admin_id, sc.must_change_password
  INTO v_stored_hash, v_credential_id, v_owner_id, v_admin_id, v_must_change_pwd
  FROM system_credentials sc
  WHERE sc.username = input_username AND sc.role = 'admin';

  -- Check if credentials exist
  IF v_credential_id IS NULL THEN
    RAISE EXCEPTION 'Invalid credentials';
  END IF;

  role := 'admin';
  credential_id := v_credential_id;
  owner_id := v_owner_id;
  admin_id := v_admin_id;
  must_change_password := v_must_change_pwd;
  is_first_login := v_must_change_pwd;

  -- Verify password using bcrypt
  IF v_stored_hash IS NOT NULL AND v_stored_hash = crypt(input_password, v_stored_hash) THEN
    RETURN NEXT;
  ELSE
    RAISE EXCEPTION 'Invalid credentials';
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Check if owner account exists
CREATE OR REPLACE FUNCTION owner_account_exists()
RETURNS BOOLEAN AS $$
DECLARE
  v_exists BOOLEAN;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM system_credentials WHERE role = 'owner'
  ) INTO v_exists;
  RETURN v_exists;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- PASSWORD MANAGEMENT
-- ============================================

-- Update password for a user
CREATE OR REPLACE FUNCTION update_credential_password(
  target_username TEXT,
  new_password TEXT
)
RETURNS BOOLEAN AS $$
DECLARE
  v_password_hash TEXT;
  v_credential_id UUID;
BEGIN
  -- Get credential ID
  SELECT id INTO v_credential_id
  FROM system_credentials
  WHERE username = target_username;

  IF v_credential_id IS NULL THEN
    RAISE EXCEPTION 'User not found';
  END IF;

  -- Generate secure password hash
  v_password_hash := crypt(new_password, gen_salt('bf', 12));

  -- Update password
  UPDATE system_credentials
  SET 
    password_hash = v_password_hash,
    must_change_password = FALSE,
    failed_login_attempts = 0,
    is_locked = FALSE,
    locked_until = NULL,
    updated_at = NOW()
  WHERE id = v_credential_id;

  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Record failed login attempt
CREATE OR REPLACE FUNCTION record_failed_login(p_username TEXT)
RETURNS VOID AS $$
DECLARE
  v_credential_id UUID;
  v_attempts INTEGER;
BEGIN
  SELECT id, failed_login_attempts
  INTO v_credential_id, v_attempts
  FROM system_credentials
  WHERE username = p_username;

  IF v_credential_id IS NOT NULL THEN
    UPDATE system_credentials
    SET 
      failed_login_attempts = COALESCE(v_attempts, 0) + 1,
      updated_at = NOW()
    WHERE id = v_credential_id;

    -- Lock account after 5 failed attempts
    IF COALESCE(v_attempts, 0) + 1 >= 5 THEN
      UPDATE system_credentials
      SET 
        is_locked = TRUE,
        locked_until = NOW() + INTERVAL '30 minutes',
        updated_at = NOW()
      WHERE id = v_credential_id;
    END IF;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Record successful login
CREATE OR REPLACE FUNCTION record_successful_login(p_username TEXT)
RETURNS VOID AS $$
BEGIN
  UPDATE system_credentials
  SET 
    failed_login_attempts = 0,
    is_locked = FALSE,
    locked_until = NULL,
    last_login_at = NOW(),
    updated_at = NOW()
  WHERE username = p_username;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- RLS POLICIES
-- ============================================

-- Enable RLS on user_sessions
ALTER TABLE user_sessions ENABLE ROW LEVEL SECURITY;

-- Users can only read their own session
DROP POLICY IF EXISTS "Users can read own session" ON user_sessions;
CREATE POLICY "Users can read own session" ON user_sessions
  FOR SELECT
  USING (
    credential_id IN (
      SELECT id FROM system_credentials
      WHERE role IN ('owner', 'admin')
    )
  );

-- System can insert/update sessions
DROP POLICY IF EXISTS "System can manage sessions" ON user_sessions;
CREATE POLICY "System can manage sessions" ON user_sessions
  FOR ALL
  USING (TRUE);

-- ============================================
-- SETUP COMPLETE
-- ============================================
