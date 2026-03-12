-- MISSING TABLES SETUP
-- Run this in Supabase SQL Editor to create all tables that the app needs
-- Safe to run multiple times (uses CREATE TABLE IF NOT EXISTS)

-- ============================================================
-- 1. NOTIFICATION TEMPLATES (Owner dashboard → Notification Templates tab)
-- ============================================================
CREATE TABLE IF NOT EXISTS notification_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_type VARCHAR(50) NOT NULL UNIQUE,
  template_content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO notification_templates (template_type, template_content) VALUES
  ('sms_reset', 'Hello {admin_name}, your login credentials have been reset. Username: {username}, Password: {password}. Login at your dashboard. - {owner_name}'),
  ('email_reset_subject', 'Your {system_name} Login Credentials'),
  ('email_reset_body', 'Hello {admin_name},

Your login credentials have been reset by {owner_name}.

Username: {username}
Password: {password}

Please log in and change your password immediately.

Best regards,
{owner_name}')
ON CONFLICT (template_type) DO NOTHING;

ALTER TABLE notification_templates ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "owners_manage_templates" ON notification_templates;
CREATE POLICY "owners_manage_templates" ON notification_templates FOR ALL USING (true);


-- ============================================================
-- 2. SYSTEM AUDIT LOGS (Owner dashboard → Activity Logs tab)
-- ============================================================
CREATE TABLE IF NOT EXISTS system_audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id UUID,
  actor_role VARCHAR(20) NOT NULL DEFAULT 'system',
  action_type VARCHAR(20) NOT NULL,
  entity_type VARCHAR(50) NOT NULL,
  entity_id UUID,
  entity_name VARCHAR(255),
  details JSONB DEFAULT '{}',
  success BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_actor ON system_audit_logs(actor_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created ON system_audit_logs(created_at DESC);

ALTER TABLE system_audit_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "audit_logs_readable" ON system_audit_logs;
CREATE POLICY "audit_logs_readable" ON system_audit_logs FOR SELECT USING (true);
DROP POLICY IF EXISTS "audit_logs_insertable" ON system_audit_logs;
CREATE POLICY "audit_logs_insertable" ON system_audit_logs FOR INSERT WITH CHECK (true);


-- ============================================================
-- 3. RECONNECTION REQUESTS (Admin dashboard → Reconnection Manager)
-- ============================================================
CREATE TABLE IF NOT EXISTS reconnection_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id UUID NOT NULL,
  phone_number VARCHAR(20) NOT NULL,
  transaction_code VARCHAR(50),
  mpesa_message TEXT,
  mac_address VARCHAR(50),
  ip_address VARCHAR(50),
  status VARCHAR(20) NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'processing', 'completed', 'rejected')),
  amount DECIMAL(10,2),
  mpesa_account VARCHAR(100),
  notes TEXT,
  is_trial BOOLEAN DEFAULT false,
  is_session BOOLEAN DEFAULT false,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_reconnection_admin ON reconnection_requests(admin_id);
CREATE INDEX IF NOT EXISTS idx_reconnection_status ON reconnection_requests(status);

ALTER TABLE reconnection_requests ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "admins_own_reconnections" ON reconnection_requests;
CREATE POLICY "admins_own_reconnections" ON reconnection_requests FOR ALL USING (true);


-- ============================================================
-- 4. SMS SETTINGS (Admin dashboard → SMS Settings tab)
-- ============================================================
CREATE TABLE IF NOT EXISTS sms_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id UUID NOT NULL UNIQUE,
  enabled BOOLEAN NOT NULL DEFAULT false,
  provider VARCHAR(50) NOT NULL DEFAULT 'twilio',
  sender_number VARCHAR(20),
  username VARCHAR(100),
  api_key_encrypted TEXT,
  message_template TEXT NOT NULL DEFAULT 'Your Wi-Fi package will expire on {expiry_date}. Please renew to continue service.',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE sms_settings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "admins_own_sms_settings" ON sms_settings;
CREATE POLICY "admins_own_sms_settings" ON sms_settings FOR ALL USING (true);


-- ============================================================
-- 5. SMS LOGS (Admin dashboard → SMS Settings tab → log section)
-- ============================================================
CREATE TABLE IF NOT EXISTS sms_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id UUID NOT NULL,
  recipient VARCHAR(20) NOT NULL,
  message TEXT NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'pending'
    CHECK (status IN ('sent', 'failed', 'pending')),
  type VARCHAR(20) NOT NULL DEFAULT 'manual'
    CHECK (type IN ('expiry', 'manual')),
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sms_logs_admin ON sms_logs(admin_id);

ALTER TABLE sms_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "admins_own_sms_logs" ON sms_logs;
CREATE POLICY "admins_own_sms_logs" ON sms_logs FOR ALL USING (true);


-- ============================================================
-- 6. WIFI SETTINGS (Admin dashboard → WiFi Settings tab)
-- ============================================================
CREATE TABLE IF NOT EXISTS wifi_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id UUID NOT NULL UNIQUE,
  hotspot_title VARCHAR(100) NOT NULL DEFAULT 'WiFi Access Portal',
  enable_trial BOOLEAN NOT NULL DEFAULT true,
  trial_minutes INTEGER NOT NULL DEFAULT 3,
  enable_vouchers BOOLEAN NOT NULL DEFAULT false,
  description TEXT NOT NULL DEFAULT 'Welcome to our WiFi service',
  theme_color VARCHAR(20) NOT NULL DEFAULT '#ef4444',
  faq_json JSONB NOT NULL DEFAULT '[]',
  contact_phone VARCHAR(20) DEFAULT '',
  contact_email VARCHAR(100) DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE wifi_settings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "admins_own_wifi_settings" ON wifi_settings;
CREATE POLICY "admins_own_wifi_settings" ON wifi_settings FOR ALL USING (true);


-- ============================================================
-- 7. PAYMENT REQUESTS (Admin dashboard → Subscription Status)
-- ============================================================
CREATE TABLE IF NOT EXISTS payment_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id UUID NOT NULL,
  phone VARCHAR(20) NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'processing', 'completed', 'rejected')),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_payment_requests_admin ON payment_requests(admin_id);

ALTER TABLE payment_requests ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "payment_requests_policy" ON payment_requests;
CREATE POLICY "payment_requests_policy" ON payment_requests FOR ALL USING (true);


-- ============================================================
-- 8. SUBSCRIPTION TIERS (Owner dashboard → used internally)
-- ============================================================
CREATE TABLE IF NOT EXISTS subscription_tiers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL,
  description TEXT,
  monthly_fee DECIMAL(10,2) NOT NULL DEFAULT 0,
  max_revenue_threshold DECIMAL(12,2),
  features JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO subscription_tiers (name, description, monthly_fee, features) VALUES
  ('Basic', 'For small ISPs - up to 50 customers', 1500.00, '{"max_customers": 50, "sms": false, "analytics": false}'),
  ('Standard', 'For growing ISPs - up to 200 customers', 3000.00, '{"max_customers": 200, "sms": true, "analytics": false}'),
  ('Enterprise', 'Unlimited customers + full features', 6000.00, '{"max_customers": -1, "sms": true, "analytics": true}')
ON CONFLICT DO NOTHING;

ALTER TABLE subscription_tiers ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "tiers_readable" ON subscription_tiers;
CREATE POLICY "tiers_readable" ON subscription_tiers FOR ALL USING (true);


-- ============================================================
-- 9. ADMIN SUBSCRIPTIONS (links admins to tiers)
-- ============================================================
CREATE TABLE IF NOT EXISTS admin_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id UUID NOT NULL REFERENCES admins(id) ON DELETE CASCADE,
  tier_id UUID REFERENCES subscription_tiers(id),
  status VARCHAR(20) NOT NULL DEFAULT 'trial'
    CHECK (status IN ('trial', 'active', 'grace', 'suspended', 'cancelled')),
  last_payment_date TIMESTAMPTZ,
  next_due_date TIMESTAMPTZ,
  grace_period_days INTEGER NOT NULL DEFAULT 7,
  total_revenue DECIMAL(12,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(admin_id)
);

ALTER TABLE admin_subscriptions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "admin_subscriptions_policy" ON admin_subscriptions;
CREATE POLICY "admin_subscriptions_policy" ON admin_subscriptions FOR ALL USING (true);


-- ============================================================
-- 10. SYSTEM SETTINGS (key-value store for platform config)
-- ============================================================
CREATE TABLE IF NOT EXISTS system_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  setting_key VARCHAR(100) NOT NULL UNIQUE,
  setting_value JSONB NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO system_settings (setting_key, setting_value, description) VALUES
  ('default_grace_period', '{"days": 7}', 'Default grace period in days before suspending unpaid subscriptions'),
  ('platform_name', '"Kingstone WiFi Billing"', 'Platform display name'),
  ('support_email', '"support@kingstonewifi.co.ke"', 'Support contact email')
ON CONFLICT (setting_key) DO NOTHING;

ALTER TABLE system_settings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "system_settings_policy" ON system_settings;
CREATE POLICY "system_settings_policy" ON system_settings FOR ALL USING (true);
