-- ============================================================
-- KINGSTONE WIFI BILLING - COMPLETE DATABASE SETUP
-- Run this ONCE in Supabase SQL Editor
-- ============================================================

BEGIN;

-- ============================================================
-- 1. CORE TABLES
-- ============================================================

-- Owners table (WiFi business owners)
CREATE TABLE IF NOT EXISTS owners (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID UNIQUE,
  business_name TEXT NOT NULL,
  subscription_status TEXT DEFAULT 'trial',
  is_trial BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Admins table (admin users under owners)
CREATE TABLE IF NOT EXISTS admins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID REFERENCES owners(id) ON DELETE CASCADE,
  username TEXT UNIQUE NOT NULL,
  password_hash TEXT,
  phone TEXT,
  email TEXT,
  must_change_password BOOLEAN DEFAULT false,
  is_trial BOOLEAN DEFAULT true,
  trial_expires_at TIMESTAMPTZ,
  trial_activated_at TIMESTAMPTZ,
  subscription_status TEXT DEFAULT 'trial',
  sms_enabled BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  business_name TEXT,
  subscription_type TEXT DEFAULT 'basic'
);

-- System credentials (for authentication)
CREATE TABLE IF NOT EXISTS system_credentials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  username TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('owner', 'admin')),
  owner_id UUID REFERENCES owners(id) ON DELETE CASCADE,
  admin_id UUID REFERENCES admins(id) ON DELETE CASCADE,
  must_change_password BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- User sessions
CREATE TABLE IF NOT EXISTS user_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_token TEXT UNIQUE NOT NULL,
  user_id UUID NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('owner', 'admin')),
  expires_at TIMESTAMPTZ NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 2. BUSINESS TABLES
-- ============================================================

-- Mikrotik routers
CREATE TABLE IF NOT EXISTS mikrotiks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id UUID REFERENCES admins(id) ON DELETE CASCADE,
  router_id TEXT,
  ip_address TEXT,
  api_port INTEGER,
  username TEXT,
  password_encrypted TEXT,
  status TEXT DEFAULT 'offline' CHECK (status IN ('online', 'offline')),
  mpesa_type TEXT CHECK (mpesa_type IN ('till', 'paybill')),
  mpesa_number TEXT,
  location TEXT,
  total_earnings DECIMAL DEFAULT 0,
  active_users INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Packages
CREATE TABLE IF NOT EXISTS packages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id UUID REFERENCES admins(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  package_type TEXT NOT NULL CHECK (package_type IN ('hotspot', 'pppoe', 'static')),
  duration_type TEXT NOT NULL CHECK (duration_type IN ('hours', 'days', 'weeks', 'months')),
  duration_value INTEGER NOT NULL,
  download_speed_mbps INTEGER,
  upload_speed_mbps INTEGER,
  bandwidth_limit_mb INTEGER,
  price DECIMAL NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- WiFi users (hotspot)
CREATE TABLE IF NOT EXISTS wifi_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id UUID REFERENCES admins(id) ON DELETE CASCADE,
  username TEXT NOT NULL,
  password TEXT,
  phone_number TEXT,
  package_id UUID REFERENCES packages(id),
  package_expires_at TIMESTAMPTZ,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Broadband users (PPPoE/Static)
CREATE TABLE IF NOT EXISTS broadband_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id UUID REFERENCES admins(id) ON DELETE CASCADE,
  username TEXT NOT NULL,
  password TEXT NOT NULL,
  user_type TEXT DEFAULT 'pppoe' CHECK (user_type IN ('pppoe', 'static')),
  phone_number TEXT,
  portal_token TEXT,
  package_id UUID REFERENCES packages(id),
  package_expires_at TIMESTAMPTZ,
  bandwidth_used_mb INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  last_login TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Payments
CREATE TABLE IF NOT EXISTS payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id UUID REFERENCES admins(id) ON DELETE CASCADE,
  user_phone TEXT,
  amount DECIMAL NOT NULL,
  package_name TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('completed', 'pending', 'failed', 'cancelled')),
  receipt_number TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- WiFi settings
CREATE TABLE IF NOT EXISTS wifi_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id UUID REFERENCES admins(id) ON DELETE CASCADE,
  hotspot_title TEXT DEFAULT 'WiFi Access Portal',
  enable_trial BOOLEAN DEFAULT true,
  trial_minutes INTEGER DEFAULT 3,
  description TEXT DEFAULT 'Welcome to our WiFi service',
  theme_color TEXT DEFAULT '#ef4444',
  faq_json JSONB DEFAULT '[]'::jsonb,
  contact_phone TEXT DEFAULT '',
  contact_email TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(admin_id)
);

-- Owner payment settings
CREATE TABLE IF NOT EXISTS owner_payment_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID REFERENCES owners(id) ON DELETE CASCADE,
  method TEXT NOT NULL CHECK (method IN ('paybill', 'till')),
  paybill_number TEXT,
  account_number TEXT,
  till_number TEXT,
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- SMS settings
CREATE TABLE IF NOT EXISTS sms_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id UUID REFERENCES admins(id) ON DELETE CASCADE,
  enabled BOOLEAN DEFAULT false,
  provider TEXT DEFAULT 'generic' CHECK (provider IN ('twilio', 'africas-talking', 'generic')),
  sender_number TEXT,
  username TEXT,
  api_key_encrypted TEXT,
  message_template TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- SMS logs
CREATE TABLE IF NOT EXISTS sms_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id UUID REFERENCES admins(id) ON DELETE CASCADE,
  recipient TEXT NOT NULL,
  message TEXT NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'failed')),
  type TEXT CHECK (type IN ('manual', 'automated', 'payment', 'expiry')),
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 3. INDEXES
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_admins_owner ON admins(owner_id);
CREATE INDEX IF NOT EXISTS idx_credentials_username ON system_credentials(username);
CREATE INDEX IF NOT EXISTS idx_sessions_token ON user_sessions(session_token);
CREATE INDEX IF NOT EXISTS idx_mikrotiks_admin ON mikrotiks(admin_id);
CREATE INDEX IF NOT EXISTS idx_packages_admin ON packages(admin_id);
CREATE INDEX IF NOT EXISTS idx_wifi_users_admin ON wifi_users(admin_id);
CREATE INDEX IF NOT EXISTS idx_broadband_users_admin ON broadband_users(admin_id);
CREATE INDEX IF NOT EXISTS idx_payments_admin ON payments(admin_id);
CREATE INDEX IF NOT EXISTS idx_wifi_settings_admin ON wifi_settings(admin_id);
CREATE INDEX IF NOT EXISTS idx_owner_payment_settings_owner ON owner_payment_settings(owner_id);

-- ============================================================
-- 4. AUTH FUNCTIONS
-- ============================================================

-- Get session admin ID
CREATE OR REPLACE FUNCTION get_session_admin_id()
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
BEGIN
  RETURN (
    SELECT sc.admin_id
    FROM user_sessions us
    JOIN system_credentials sc ON sc.id = us.user_id
    WHERE us.session_token = current_setting('request.headers', true)::json->>'x-session-token'
      AND us.role = 'admin'
      AND us.expires_at > NOW()
      AND us.is_active = true
    LIMIT 1
  );
END;
$$;

-- Get session owner ID
CREATE OR REPLACE FUNCTION get_session_owner_id()
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
BEGIN
  RETURN (
    SELECT sc.owner_id
    FROM user_sessions us
    JOIN system_credentials sc ON sc.id = us.user_id
    WHERE us.session_token = current_setting('request.headers', true)::json->>'x-session-token'
      AND us.role = 'owner'
      AND us.expires_at > NOW()
      AND us.is_active = true
    LIMIT 1
  );
END;
$$;

-- Get owner profile by session
CREATE OR REPLACE FUNCTION get_owner_profile_by_session(p_session_token TEXT)
RETURNS TABLE(id UUID, business_name TEXT, subscription_status TEXT)
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
BEGIN
  RETURN QUERY
  SELECT o.id, o.business_name, o.subscription_status
  FROM owners o
  JOIN system_credentials sc ON sc.owner_id = o.id
  JOIN user_sessions us ON us.user_id = sc.id
  WHERE us.session_token = p_session_token
    AND us.role = 'owner'
    AND us.expires_at > NOW()
    AND us.is_active = true
  LIMIT 1;
END;
$$;

-- ============================================================
-- 5. DEFAULT DATA
-- ============================================================

-- Create default owner if none exists
DO $$
DECLARE
  v_owner_id UUID;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM owners LIMIT 1) THEN
    INSERT INTO owners (business_name, subscription_status, is_trial)
    VALUES ('Kingstone WiFi', 'trial', true)
    RETURNING id INTO v_owner_id;

    -- Create default admin
    INSERT INTO admins (owner_id, username, email, business_name, is_trial, subscription_status)
    VALUES (v_owner_id, 'admin', 'admin@kingstone.local', 'Kingstone WiFi', true, 'trial');

    -- Create credential for admin
    INSERT INTO system_credentials (username, password_hash, role, admin_id)
    SELECT 'admin', crypt('admin123', gen_salt('bf')), 'admin', id
    FROM admins WHERE username = 'admin';

    RAISE NOTICE '✅ Created default owner and admin user';
    RAISE NOTICE '   Username: admin';
    RAISE NOTICE '   Password: admin123';
  ELSE
    RAISE NOTICE 'ℹ️  Owner already exists';
  END IF;
END $$;

COMMIT;

-- ============================================================
-- 6. VERIFICATION
-- ============================================================

SELECT '=== DATABASE SETUP COMPLETE ===' as status;

SELECT table_name, 
       (SELECT count(*) FROM information_schema.columns c WHERE c.table_name = t.table_name) as columns
FROM information_schema.tables t
WHERE table_schema = 'public' 
  AND table_type = 'BASE TABLE'
ORDER BY table_name;

SELECT '✅ ALL TABLES CREATED!' as final_status;
