-- ============================================
-- MIGRATION GUIDE
-- For existing installations upgrading to v2.0
-- ============================================

-- IMPORTANT: Backup your database before running these migrations!
-- pg_dump -h db.xxx.supabase.co -U postgres -d postgres -f backup.sql

-- ============================================
-- STEP 1: Add New Columns to Existing Tables
-- ============================================

-- Add email verification to profiles
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS is_email_verified BOOLEAN DEFAULT FALSE;

-- Add trial management to owners
ALTER TABLE owners 
ADD COLUMN IF NOT EXISTS is_trial BOOLEAN DEFAULT TRUE,
ADD COLUMN IF NOT EXISTS trial_expires_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS trial_activated_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS subscription_status TEXT DEFAULT 'trial' 
  CHECK (subscription_status IN ('trial', 'active', 'suspended', 'cancelled'));

-- Add trial management and security to admins
ALTER TABLE admins 
ADD COLUMN IF NOT EXISTS must_change_password BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS is_trial BOOLEAN DEFAULT TRUE,
ADD COLUMN IF NOT EXISTS trial_expires_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS trial_activated_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS subscription_status TEXT DEFAULT 'trial' 
  CHECK (subscription_status IN ('trial', 'active', 'suspended', 'cancelled'));

-- Add security features to system_credentials
ALTER TABLE system_credentials 
ADD COLUMN IF NOT EXISTS is_locked BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS failed_login_attempts INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS locked_until TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS last_login_at TIMESTAMPTZ;

-- ============================================
-- STEP 2: Create OTP Verification Table
-- ============================================

CREATE TABLE IF NOT EXISTS otp_verifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL,
  otp_code TEXT NOT NULL,
  purpose TEXT NOT NULL CHECK (purpose IN ('registration', 'password_reset', 'email_verification')),
  expires_at TIMESTAMPTZ NOT NULL,
  used_at TIMESTAMPTZ,
  is_used BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_otp_verifications_email ON otp_verifications(email);
CREATE INDEX IF NOT EXISTS idx_otp_verifications_expires ON otp_verifications(expires_at);

-- Enable RLS
ALTER TABLE otp_verifications ENABLE ROW LEVEL SECURITY;

-- ============================================
-- STEP 3: Create Helper Functions
-- ============================================

-- Generate OTP function
CREATE OR REPLACE FUNCTION generate_otp()
RETURNS TEXT AS $$
DECLARE
  otp TEXT;
BEGIN
  otp := LPAD(FLOOR(RANDOM() * 1000000)::TEXT, 6, '0');
  RETURN otp;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Validate OTP function
CREATE OR REPLACE FUNCTION validate_otp(p_email TEXT, p_otp TEXT)
RETURNS JSON AS $$
DECLARE
  v_otp_record otp_verifications%ROWTYPE;
BEGIN
  -- Get the latest unused OTP for this email
  SELECT * INTO v_otp_record
  FROM otp_verifications
  WHERE email = p_email 
    AND otp_code = p_otp
    AND is_used = FALSE
    AND expires_at > NOW()
  ORDER BY created_at DESC
  LIMIT 1;

  -- Check if OTP was found
  IF v_otp_record.id IS NULL THEN
    -- Check if OTP exists but is expired
    SELECT * INTO v_otp_record
    FROM otp_verifications
    WHERE email = p_email 
      AND otp_code = p_otp
      AND is_used = FALSE
    ORDER BY created_at DESC
    LIMIT 1;

    IF v_otp_record.id IS NOT NULL THEN
      RETURN json_build_object(
        'success', false,
        'error', 'OTP has expired. Please request a new one.',
        'expired', true
      );
    END IF;

    RETURN json_build_object(
      'success', false,
      'error', 'Invalid OTP code',
      'expired', false
    );
  END IF;

  -- Mark OTP as used
  UPDATE otp_verifications
  SET is_used = TRUE, used_at = NOW()
  WHERE id = v_otp_record.id;

  RETURN json_build_object(
    'success', true,
    'message', 'OTP verified successfully',
    'email', p_email
  );
EXCEPTION
  WHEN OTHERS THEN
    RETURN json_build_object(
      'success', false,
      'error', SQLERRM
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Cleanup function
CREATE OR REPLACE FUNCTION cleanup_expired_otps()
RETURNS INTEGER AS $$
DECLARE
  v_deleted_count INTEGER;
BEGIN
  DELETE FROM otp_verifications
  WHERE expires_at < NOW() OR created_at < (NOW() - INTERVAL '7 days');
  
  GET DIAGNOSTICS v_deleted_count = ROW_COUNT;
  RETURN v_deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- STEP 4: Update Registration Functions
-- ============================================

-- Drop old function if exists
DROP FUNCTION IF EXISTS register_owner(TEXT, TEXT, TEXT, TEXT);

-- Create new register_owner function with OTP
CREATE OR REPLACE FUNCTION register_owner(
  p_full_name TEXT,
  p_email TEXT,
  p_phone_number TEXT,
  p_password TEXT,
  p_otp TEXT
)
RETURNS JSON AS $$
DECLARE
  v_profile_id UUID;
  v_owner_id UUID;
  v_password_hash TEXT;
  v_valid_otp BOOLEAN;
  v_normalized_email TEXT;
  v_otp_result JSON;
BEGIN
  -- Normalize email (trim and lowercase)
  v_normalized_email := LOWER(TRIM(p_email));

  -- Validate OTP by calling validate_otp function
  v_otp_result := validate_otp(v_normalized_email, p_otp);
  v_valid_otp := (v_otp_result->>'success')::BOOLEAN;

  IF NOT v_valid_otp THEN
    RETURN json_build_object(
      'success', false,
      'error', COALESCE(v_otp_result->>'error', 'Invalid or expired OTP. Please verify and try again.')
    );
  END IF;

  -- Generate secure password hash
  v_password_hash := crypt(p_password, gen_salt('bf', 12));

  -- Insert into profiles
  INSERT INTO profiles (full_name, email, phone, role, is_email_verified)
  VALUES (p_full_name, v_normalized_email, p_phone_number, 'owner', TRUE)
  RETURNING id INTO v_profile_id;

  -- Insert into owners with 14-day trial
  INSERT INTO owners (profile_id, business_name, is_trial, trial_expires_at, trial_activated_at, subscription_status)
  VALUES (
    v_profile_id,
    INITCAP(TRIM(p_full_name)) || '''s Business',
    TRUE,
    NOW() + INTERVAL '14 days',
    NOW(),
    'trial'
  )
  RETURNING id INTO v_owner_id;

  -- Insert into system_credentials
  INSERT INTO system_credentials (username, password_hash, role, owner_id)
  VALUES (v_normalized_email, v_password_hash, 'owner', v_owner_id);

  -- Clean up used OTPs
  UPDATE otp_verifications
  SET is_used = TRUE, used_at = NOW()
  WHERE email = v_normalized_email AND is_used = FALSE;

  RETURN json_build_object(
    'success', true,
    'owner_id', v_owner_id,
    'profile_id', v_profile_id,
    'message', 'Owner registered successfully',
    'trial_expires_at', (SELECT trial_expires_at FROM owners WHERE id = v_owner_id)
  );
EXCEPTION
  WHEN unique_violation THEN
    RETURN json_build_object(
      'success', false,
      'error', 'An account with this email already exists'
    );
  WHEN OTHERS THEN
    RETURN json_build_object(
      'success', false,
      'error', SQLERRM
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create request_registration_otp function
CREATE OR REPLACE FUNCTION request_registration_otp(p_email TEXT, p_full_name TEXT)
RETURNS JSON AS $$
DECLARE
  v_otp TEXT;
  v_otp_id UUID;
  v_existing_profile profiles%ROWTYPE;
  v_normalized_email TEXT;
BEGIN
  -- Normalize email (trim and lowercase)
  v_normalized_email := LOWER(TRIM(p_email));

  -- Check if profile already exists
  SELECT * INTO v_existing_profile FROM profiles WHERE email = v_normalized_email;

  IF v_existing_profile.id IS NOT NULL THEN
    RETURN json_build_object(
      'success', false,
      'error', 'An account with this email already exists. Please login instead.'
    );
  END IF;

  -- Generate OTP
  v_otp := generate_otp();

  -- Insert OTP record (expires in 10 minutes)
  INSERT INTO otp_verifications (email, otp_code, purpose, expires_at)
  VALUES (v_normalized_email, v_otp, 'registration', NOW() + INTERVAL '10 minutes')
  RETURNING id INTO v_otp_id;

  RETURN json_build_object(
    'success', true,
    'message', 'OTP sent successfully to your email',
    'otp_id', v_otp_id,
    'expires_in', 600,
    '_debug_otp', v_otp  -- Remove in production!
  );
EXCEPTION
  WHEN OTHERS THEN
    RETURN json_build_object(
      'success', false,
      'error', SQLERRM
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- STEP 5: Update RLS Policies
-- ============================================

-- Add policy for otp_verifications
DROP POLICY IF EXISTS "Users can create OTP for own email" ON otp_verifications;
CREATE POLICY "Users can create OTP for own email" ON otp_verifications
  FOR INSERT WITH CHECK (email IS NOT NULL);

DROP POLICY IF EXISTS "System can read OTP for verification" ON otp_verifications;
CREATE POLICY "System can read OTP for verification" ON otp_verifications
  FOR SELECT USING (TRUE);

-- ============================================
-- STEP 6: Migrate Existing Data
-- ============================================

-- Update existing owners to have trial status
UPDATE owners 
SET 
  is_trial = TRUE,
  trial_expires_at = COALESCE(trial_expires_at, NOW() + INTERVAL '14 days'),
  trial_activated_at = COALESCE(trial_activated_at, NOW()),
  subscription_status = COALESCE(subscription_status, 'trial')
WHERE subscription_status IS NULL;

-- Update existing admins to have trial status
UPDATE admins 
SET 
  is_trial = TRUE,
  trial_expires_at = COALESCE(trial_expires_at, NOW() + INTERVAL '14 days'),
  trial_activated_at = COALESCE(trial_activated_at, NOW()),
  subscription_status = COALESCE(subscription_status, 'trial')
WHERE subscription_status IS NULL;

-- ============================================
-- STEP 7: Verification
-- ============================================

-- Verify all functions exist
SELECT 
  routine_name,
  routine_type,
  created
FROM information_schema.routines 
WHERE routine_schema = 'public' 
  AND routine_name IN ('register_owner', 'request_registration_otp', 'validate_otp', 'generate_otp', 'cleanup_expired_otps');

-- Verify table structure
SELECT 
  table_name,
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name IN ('profiles', 'owners', 'admins', 'system_credentials', 'otp_verifications')
ORDER BY table_name, ordinal_position;

-- ============================================
-- MIGRATION COMPLETE
-- ============================================

-- Next steps:
-- 1. Test registration flow
-- 2. Deploy edge function for email sending
-- 3. Remove _debug_otp from production
-- 4. Set up monitoring
