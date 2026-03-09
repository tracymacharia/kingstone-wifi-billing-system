-- ============================================
-- Kingstone WiFi Billing System - Clean Database Setup
-- Run this in Supabase SQL Editor
-- ============================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ============================================
-- CORE TABLES
-- ============================================

-- Profiles (links auth.users to app)
CREATE TABLE profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE,
  full_name TEXT,
  phone TEXT,
  email TEXT,
  role TEXT NOT NULL CHECK (role IN ('owner','admin','client')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Owners
CREATE TABLE owners (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  business_name TEXT,
  paybill_number TEXT,
  paybill_account TEXT,
  till_number TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Admins
CREATE TABLE admins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  owner_id UUID REFERENCES owners(id) ON DELETE CASCADE,
  username TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  phone TEXT,
  email TEXT,
  sms_enabled BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Mikrotiks
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

-- Packages
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

-- Vouchers
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

-- WiFi Users
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

-- Payments
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

-- System Credentials (for admin/owner login)
CREATE TABLE system_credentials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  username TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('owner', 'admin')),
  admin_id UUID REFERENCES admins(id) ON DELETE CASCADE,
  owner_id UUID REFERENCES owners(id) ON DELETE CASCADE,
  must_change_password BOOLEAN DEFAULT FALSE,
  recovery_email TEXT,
  recovery_phone TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- HELPER FUNCTION
-- ============================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

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
-- ROW LEVEL SECURITY
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

-- Simple policies (adjust based on your auth needs)
CREATE POLICY "Public profiles read" ON profiles FOR SELECT USING (TRUE);
CREATE POLICY "Users update own profile" ON profiles FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Admins manage mikrotiks" ON mikrotiks FOR ALL USING (auth.uid() IN (SELECT admin_id FROM admins));
CREATE POLICY "Admins manage packages" ON packages FOR ALL USING (auth.uid() IN (SELECT admin_id FROM admins));
CREATE POLICY "Admins manage vouchers" ON vouchers FOR ALL USING (auth.uid() IN (SELECT admin_id FROM admins));
CREATE POLICY "Admins manage wifi_users" ON wifi_users FOR ALL USING (auth.uid() IN (SELECT admin_id FROM admins));
CREATE POLICY "Admins manage payments" ON payments FOR ALL USING (auth.uid() IN (SELECT admin_id FROM admins));

-- ============================================
-- DEFAULT DATA
-- ============================================
INSERT INTO system_credentials (username, password_hash, role)
VALUES ('admin', crypt('admin123', gen_salt('bf')), 'admin')
ON CONFLICT (username) DO NOTHING;

-- ============================================
-- SETUP COMPLETE
-- ============================================
