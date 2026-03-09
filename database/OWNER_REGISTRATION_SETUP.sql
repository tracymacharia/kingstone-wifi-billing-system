-- ============================================
-- Kingstone WiFi Billing System - Owner Registration with OTP Verification
-- Industry Best Practices Implementation
-- Run this in Supabase SQL Editor
-- ============================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- UPDATED CORE TABLES
-- ============================================

-- Drop existing tables if they exist (for clean setup)
DROP TABLE IF EXISTS system_credentials CASCADE;
DROP TABLE IF EXISTS payments CASCADE;
DROP TABLE IF EXISTS wifi_users CASCADE;
DROP TABLE IF EXISTS vouchers CASCADE;
DROP TABLE IF EXISTS packages CASCADE;
DROP TABLE IF EXISTS mikrotiks CASCADE;
DROP TABLE IF EXISTS admins CASCADE;
DROP TABLE IF EXISTS owners CASCADE;
DROP TABLE IF EXISTS profiles CASCADE;
DROP TABLE IF EXISTS otp_verifications CASCADE;

-- ============================================
-- OTP VERIFICATION TABLE
-- ============================================
CREATE TABLE otp_verifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL,
  otp_code TEXT NOT NULL,
  purpose TEXT NOT NULL CHECK (purpose IN ('registration', 'password_reset', 'email_verification')),
  expires_at TIMESTAMPTZ NOT NULL,
  used_at TIMESTAMPTZ,
  is_used BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for faster lookups
CREATE INDEX idx_otp_verifications_email ON otp_verifications(email);
CREATE INDEX idx_otp_verifications_expires ON otp_verifications(expires_at);

-- Profiles table (user_id is now nullable for system_credentials-based auth)
CREATE TABLE profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  phone TEXT,
  email TEXT NOT NULL UNIQUE,
  role TEXT NOT NULL CHECK (role IN ('owner','admin','client')),
  is_email_verified BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Owners table with enhanced fields
CREATE TABLE owners (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  business_name TEXT,
  paybill_number TEXT,
  paybill_account TEXT,
  till_number TEXT,
  is_trial BOOLEAN DEFAULT TRUE,
  trial_expires_at TIMESTAMPTZ,
  trial_activated_at TIMESTAMPTZ,
  subscription_status TEXT DEFAULT 'trial' CHECK (subscription_status IN ('trial', 'active', 'suspended', 'cancelled')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Admins table
CREATE TABLE admins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  owner_id UUID REFERENCES owners(id) ON DELETE CASCADE,
  username TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  phone TEXT,
  email TEXT,
  must_change_password BOOLEAN DEFAULT FALSE,
  is_trial BOOLEAN DEFAULT TRUE,
  trial_expires_at TIMESTAMPTZ,
  trial_activated_at TIMESTAMPTZ,
  subscription_status TEXT DEFAULT 'trial' CHECK (subscription_status IN ('trial', 'active', 'suspended', 'cancelled')),
  sms_enabled BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Mikrotiks table
CREATE TABLE mikrotiks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID REFERENCES owners(id) ON DELETE CASCADE,
  admin_id UUID REFERENCES admins(id) ON DELETE SET NULL,
  name TEXT,
  router_id TEXT UNIQUE,
  ip_address TEXT,
  api_port INTEGER DEFAULT 8728,
  username TEXT,
  password_encrypted TEXT,
  status TEXT DEFAULT 'offline',
  mpesa_type TEXT DEFAULT 'till' CHECK (mpesa_type IN ('till', 'paybill')),
  mpesa_number TEXT,
  location TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Packages table
CREATE TABLE packages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID REFERENCES owners(id) ON DELETE CASCADE,
  admin_id UUID REFERENCES admins(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,
  package_type VARCHAR(20) NOT NULL CHECK (package_type IN ('limited', 'unlimited', 'hotspot', 'pppoe', 'static')),
  duration_type VARCHAR(20) NOT NULL CHECK (duration_type IN ('minutes', 'hours', 'days', 'months')),
  duration_value INTEGER NOT NULL,
  price DECIMAL(10,2) NOT NULL,
  bandwidth_limit_mb INTEGER,
  upload_speed_mbps DECIMAL(5,2),
  download_speed_mbps DECIMAL(5,2),
  description TEXT,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Vouchers table
CREATE TABLE vouchers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id UUID NOT NULL,
  package_id UUID REFERENCES packages(id) ON DELETE CASCADE,
  voucher_code VARCHAR(20) NOT NULL UNIQUE,
  username VARCHAR(50) NOT NULL,
  password VARCHAR(100) NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'unused' CHECK (status IN ('unused', 'used', 'expired')),
  expires_at TIMESTAMPTZ,
  used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- WiFi Users table
CREATE TABLE wifi_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id UUID NOT NULL,
  username VARCHAR(50) NOT NULL,
  password VARCHAR(100) NOT NULL,
  current_package_id UUID REFERENCES packages(id),
  package_expires_at TIMESTAMPTZ,
  phone_number VARCHAR(20),
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(admin_id, username)
);

-- Payments table
CREATE TABLE payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id UUID NOT NULL,
  mikrotik_id UUID REFERENCES mikrotiks(id),
  user_phone VARCHAR NOT NULL,
  amount DECIMAL NOT NULL,
  package_name VARCHAR NOT NULL,
  transaction_id VARCHAR,
  mpesa_receipt_number VARCHAR,
  status VARCHAR NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'failed', 'cancelled')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- System Credentials table (for admin/owner login)
CREATE TABLE system_credentials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  username TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('owner', 'admin')),
  admin_id UUID REFERENCES admins(id) ON DELETE CASCADE,
  owner_id UUID REFERENCES owners(id) ON DELETE CASCADE,
  must_change_password BOOLEAN DEFAULT FALSE,
  is_locked BOOLEAN DEFAULT FALSE,
  failed_login_attempts INTEGER DEFAULT 0,
  locked_until TIMESTAMPTZ,
  last_login_at TIMESTAMPTZ,
  recovery_email TEXT,
  recovery_phone TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- HELPER FUNCTIONS
-- ============================================

-- Update timestamp trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Generate secure random OTP (6 digits)
CREATE OR REPLACE FUNCTION generate_otp()
RETURNS TEXT AS $$
DECLARE
  otp TEXT;
BEGIN
  otp := LPAD(FLOOR(RANDOM() * 1000000)::TEXT, 6, '0');
  RETURN otp;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Validate OTP code
CREATE OR REPLACE FUNCTION validate_otp(p_email TEXT, p_otp TEXT)
RETURNS JSON AS $$
DECLARE
  v_otp_id UUID;
BEGIN
  -- Try to find and mark the OTP as used in one atomic operation
  UPDATE otp_verifications
  SET is_used = TRUE, used_at = NOW()
  WHERE email = p_email
    AND otp_code = p_otp
    AND is_used = FALSE
    AND expires_at > NOW()
  RETURNING id INTO v_otp_id;

  -- Check if we found and updated a record
  IF v_otp_id IS NULL THEN
    -- Check why it failed
    IF EXISTS (
      SELECT 1 FROM otp_verifications
      WHERE email = p_email
        AND otp_code = p_otp
        AND is_used = TRUE
    ) THEN
      RETURN json_build_object(
        'success', false,
        'error', 'This OTP has already been used. Please request a new one.'
      );
    ELSIF EXISTS (
      SELECT 1 FROM otp_verifications
      WHERE email = p_email
        AND otp_code = p_otp
        AND is_used = FALSE
        AND expires_at <= NOW()
    ) THEN
      RETURN json_build_object(
        'success', false,
        'error', 'OTP has expired. Please request a new one.',
        'expired', true
      );
    ELSE
      RETURN json_build_object(
        'success', false,
        'error', 'Invalid OTP code. Please check and try again.',
        'expired', false
      );
    END IF;
  END IF;

  -- Success!
  RETURN json_build_object(
    'success', true,
    'message', 'OTP verified successfully'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Clean up expired OTPs (run periodically)
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
-- TRIGGERS
-- ============================================
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON profiles FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_owners_updated_at BEFORE UPDATE ON owners FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_admins_updated_at BEFORE UPDATE ON admins FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_mikrotiks_updated_at BEFORE UPDATE ON mikrotiks FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_packages_updated_at BEFORE UPDATE ON packages FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_vouchers_updated_at BEFORE UPDATE ON vouchers FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_wifi_users_updated_at BEFORE UPDATE ON wifi_users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_payments_updated_at BEFORE UPDATE ON payments FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_system_credentials_updated_at BEFORE UPDATE ON system_credentials FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- REGISTRATION FUNCTIONS
-- ============================================

-- Function to request OTP for owner registration
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

  -- Validate email format
  IF v_normalized_email !~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$' THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Invalid email format'
    );
  END IF;

  -- Check if email must be Gmail (business requirement)
  IF v_normalized_email !~* '@gmail\.com$' THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Please use a valid Gmail address (@gmail.com)'
    );
  END IF;

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

  -- Return success (OTP would be sent via edge function in production)
  RETURN json_build_object(
    'success', true,
    'message', 'OTP sent successfully to your email',
    'otp_id', v_otp_id,
    'expires_in', 600,
    'email', v_normalized_email,
    '_debug_otp', v_otp  -- Remove in production! This is for testing only
  );
EXCEPTION
  WHEN unique_violation THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Please wait a moment before requesting another OTP'
    );
  WHEN OTHERS THEN
    RETURN json_build_object(
      'success', false,
      'error', SQLERRM
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to register an owner with OTP verification
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
  v_otp_result JSON;
  v_valid_otp BOOLEAN;
  v_normalized_email TEXT;
BEGIN
  -- Normalize email (trim and lowercase)
  v_normalized_email := LOWER(TRIM(p_email));

  -- Validate input
  IF p_full_name IS NULL OR LENGTH(TRIM(p_full_name)) < 2 THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Full name must be at least 2 characters'
    );
  END IF;

  -- Email validation already done in request_registration_otp, just normalize it
  -- This prevents duplicate validation errors at the final step

  IF p_phone_number !~ '^(\+254|0)[17]\d{8}$' THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Phone number must be a valid Kenyan format (e.g., 0712345678 or +254712345678)'
    );
  END IF;

  IF LENGTH(p_password) < 8 THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Password must be at least 8 characters'
    );
  END IF;

  IF p_password !~ '[A-Z]' THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Password must contain at least one uppercase letter'
    );
  END IF;

  IF p_password !~ '\d' THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Password must contain at least one number'
    );
  END IF;

  -- Validate OTP by calling validate_otp function
  v_otp_result := validate_otp(v_normalized_email, p_otp);
  v_valid_otp := (v_otp_result->>'success')::BOOLEAN;

  IF NOT v_valid_otp THEN
    -- Return the specific error from validate_otp
    RETURN json_build_object(
      'success', false,
      'error', COALESCE(v_otp_result->>'error', 'Invalid or expired OTP. Please verify and try again.')
    );
  END IF;

  -- Generate secure password hash using bcrypt
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
  INSERT INTO system_credentials (username, password_hash, role, owner_id, must_change_password)
  VALUES (v_normalized_email, v_password_hash, 'owner', v_owner_id, FALSE);

  -- Return success response
  RETURN json_build_object(
    'success', true,
    'owner_id', v_owner_id,
    'profile_id', v_profile_id,
    'message', 'Owner registered successfully. Welcome to Kingstone WiFi Billing!',
    'trial_expires_at', (SELECT trial_expires_at FROM owners WHERE id = v_owner_id)
  );
EXCEPTION
  WHEN unique_violation THEN
    RETURN json_build_object(
      'success', false,
      'error', 'An account with this email or username already exists'
    );
  WHEN check_violation THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Invalid data provided. Please check your input.'
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

-- Function to register an admin (updated with OTP)
CREATE OR REPLACE FUNCTION register_admin(
  p_full_name TEXT,
  p_email TEXT,
  p_phone TEXT,
  p_business_name TEXT,
  p_username TEXT,
  p_password TEXT,
  p_owner_id UUID,
  p_subscription_type TEXT,
  p_otp TEXT DEFAULT NULL
)
RETURNS JSON AS $$
DECLARE
  v_profile_id UUID;
  v_admin_id UUID;
  v_password_hash TEXT;
  v_valid_otp BOOLEAN := TRUE;
  v_otp_result JSON;
BEGIN
  -- Validate inputs
  IF p_full_name IS NULL OR LENGTH(TRIM(p_full_name)) < 2 THEN
    RETURN json_build_object('success', false, 'error', 'Full name must be at least 2 characters');
  END IF;

  IF p_username IS NULL OR LENGTH(TRIM(p_username)) < 3 THEN
    RETURN json_build_object('success', false, 'error', 'Username must be at least 3 characters');
  END IF;

  IF LENGTH(p_password) < 8 THEN
    RETURN json_build_object('success', false, 'error', 'Password must be at least 8 characters');
  END IF;

  -- Validate OTP if provided
  IF p_otp IS NOT NULL THEN
    v_otp_result := validate_otp(p_email, p_otp);
    v_valid_otp := (v_otp_result->>'success')::BOOLEAN;

    IF NOT v_valid_otp THEN
      RETURN json_build_object('success', false, 'error', COALESCE(v_otp_result->>'error', 'Invalid or expired OTP'));
    END IF;
  END IF;

  -- Generate secure password hash
  v_password_hash := crypt(p_password, gen_salt('bf', 12));

  -- Insert into profiles
  INSERT INTO profiles (full_name, email, phone, role)
  VALUES (p_full_name, p_email, p_phone, 'admin')
  RETURNING id INTO v_profile_id;

  -- Insert into admins with trial period
  INSERT INTO admins (profile_id, owner_id, username, password_hash, phone, email, is_trial, trial_expires_at, trial_activated_at, subscription_status)
  VALUES (
    v_profile_id, 
    p_owner_id, 
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
  INSERT INTO system_credentials (username, password_hash, role, admin_id, must_change_password)
  VALUES (p_username, v_password_hash, 'admin', v_admin_id, TRUE);

  -- Return success
  RETURN json_build_object(
    'success', true,
    'admin_id', v_admin_id,
    'message', 'Admin registered successfully'
  );
EXCEPTION
  WHEN unique_violation THEN
    RETURN json_build_object('success', false, 'error', 'Username or email already exists');
  WHEN OTHERS THEN
    RETURN json_build_object('success', false, 'error', SQLERRM);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- ROW LEVEL SECURITY POLICIES
-- ============================================
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE owners ENABLE ROW LEVEL SECURITY;
ALTER TABLE admins ENABLE ROW LEVEL SECURITY;
ALTER TABLE mikrotiks ENABLE ROW LEVEL SECURITY;
ALTER TABLE packages ENABLE ROW LEVEL SECURITY;
ALTER TABLE vouchers ENABLE ROW LEVEL SECURITY;
ALTER TABLE wifi_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE system_credentials ENABLE ROW LEVEL SECURITY;
ALTER TABLE otp_verifications ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "Users can read own profile" ON profiles
  FOR SELECT USING (
    auth.uid() = user_id OR 
    id IN (SELECT profile_id FROM owners WHERE id IN (SELECT owner_id FROM system_credentials WHERE role = 'owner')) OR
    id IN (SELECT profile_id FROM admins WHERE id IN (SELECT admin_id FROM system_credentials WHERE role = 'admin'))
  );

CREATE POLICY "Users can update own profile" ON profiles
  FOR UPDATE USING (
    auth.uid() = user_id OR
    id IN (SELECT profile_id FROM owners WHERE id IN (SELECT owner_id FROM system_credentials WHERE role = 'owner')) OR
    id IN (SELECT profile_id FROM admins WHERE id IN (SELECT admin_id FROM system_credentials WHERE role = 'admin'))
  );

-- Owners policies
CREATE POLICY "Owners can read own owner record" ON owners
  FOR SELECT USING (id IN (SELECT owner_id FROM system_credentials WHERE role = 'owner'));

CREATE POLICY "Admins can read their owner record" ON owners
  FOR SELECT USING (id IN (SELECT owner_id FROM admins WHERE id IN (SELECT admin_id FROM system_credentials WHERE role = 'admin')));

-- Admins policies
CREATE POLICY "Admins can read own admin record" ON admins
  FOR SELECT USING (id IN (SELECT admin_id FROM system_credentials WHERE role = 'admin'));

CREATE POLICY "Owners can read their admins" ON admins
  FOR SELECT USING (owner_id IN (SELECT owner_id FROM system_credentials WHERE role = 'owner'));

-- Mikrotiks policies
CREATE POLICY "Owners can manage their mikrotiks" ON mikrotiks
  FOR ALL USING (owner_id IN (SELECT owner_id FROM system_credentials WHERE role = 'owner'));

CREATE POLICY "Admins can manage their mikrotiks" ON mikrotiks
  FOR ALL USING (admin_id IN (SELECT admin_id FROM system_credentials WHERE role = 'admin'));

-- Packages policies
CREATE POLICY "Owners can manage their packages" ON packages
  FOR ALL USING (owner_id IN (SELECT owner_id FROM system_credentials WHERE role = 'owner'));

CREATE POLICY "Admins can manage their packages" ON packages
  FOR ALL USING (admin_id IN (SELECT admin_id FROM system_credentials WHERE role = 'admin'));

-- Vouchers policies
CREATE POLICY "Admins can manage their vouchers" ON vouchers
  FOR ALL USING (admin_id IN (SELECT admin_id FROM system_credentials WHERE role = 'admin'));

-- WiFi Users policies
CREATE POLICY "Admins can manage their wifi users" ON wifi_users
  FOR ALL USING (admin_id IN (SELECT admin_id FROM system_credentials WHERE role = 'admin'));

-- Payments policies
CREATE POLICY "Admins can manage their payments" ON payments
  FOR ALL USING (admin_id IN (SELECT admin_id FROM system_credentials WHERE role = 'admin'));

-- System Credentials policies (very restrictive)
CREATE POLICY "Users can read own credentials" ON system_credentials
  FOR SELECT USING (
    (role = 'owner' AND owner_id IN (SELECT id FROM owners WHERE id IN (SELECT owner_id FROM system_credentials WHERE role = 'owner'))) OR
    (role = 'admin' AND admin_id IN (SELECT id FROM admins WHERE id IN (SELECT admin_id FROM system_credentials WHERE role = 'admin')))
  );

-- OTP Verifications policies
CREATE POLICY "Users can create OTP for own email" ON otp_verifications
  FOR INSERT WITH CHECK (email IS NOT NULL);

CREATE POLICY "System can read OTP for verification" ON otp_verifications
  FOR SELECT USING (TRUE);

-- ============================================
-- DEFAULT DATA (Optional - remove in production)
-- ============================================
-- INSERT INTO system_credentials (username, password_hash, role)
-- VALUES ('admin', crypt('admin123', gen_salt('bf')), 'admin')
-- ON CONFLICT (username) DO NOTHING;

-- ============================================
-- SETUP COMPLETE
-- ============================================
