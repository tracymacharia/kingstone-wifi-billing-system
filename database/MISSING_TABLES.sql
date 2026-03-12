-- MISSING TABLES SETUP
-- Every section is wrapped in a DO block. If anything in a section fails,
-- it prints a notice and moves on. The entire script will run to completion.

-- ============================================================
-- 1. NOTIFICATION TEMPLATES
-- ============================================================
DO $$
BEGIN
  CREATE TABLE IF NOT EXISTS notification_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid()
  );
  ALTER TABLE notification_templates ADD COLUMN IF NOT EXISTS template_type    VARCHAR(50);
  ALTER TABLE notification_templates ADD COLUMN IF NOT EXISTS template_content TEXT;
  ALTER TABLE notification_templates ADD COLUMN IF NOT EXISTS created_at       TIMESTAMPTZ DEFAULT NOW();
  ALTER TABLE notification_templates ADD COLUMN IF NOT EXISTS updated_at       TIMESTAMPTZ DEFAULT NOW();
  BEGIN ALTER TABLE notification_templates ALTER COLUMN name       DROP NOT NULL; EXCEPTION WHEN OTHERS THEN NULL; END;
  BEGIN ALTER TABLE notification_templates ALTER COLUMN description DROP NOT NULL; EXCEPTION WHEN OTHERS THEN NULL; END;
  BEGIN
    IF NOT EXISTS (
      SELECT 1 FROM pg_constraint
      WHERE conname = 'notification_templates_template_type_key'
        AND conrelid = 'notification_templates'::regclass
    ) THEN
      ALTER TABLE notification_templates ADD CONSTRAINT notification_templates_template_type_key UNIQUE (template_type);
    END IF;
  EXCEPTION WHEN OTHERS THEN NULL;
  END;
  BEGIN
    INSERT INTO notification_templates (template_type, template_content) VALUES
      ('sms_reset',           'Hello {admin_name}, your credentials were reset. Username: {username}, Password: {password}. - {owner_name}'),
      ('email_reset_subject', 'Your {system_name} Login Credentials'),
      ('email_reset_body',    'Hello {admin_name}, your credentials were reset by {owner_name}. Username: {username} Password: {password}')
    ON CONFLICT (template_type) DO NOTHING;
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'Skipped seeding notification_templates: %', SQLERRM;
  END;
  ALTER TABLE notification_templates ENABLE ROW LEVEL SECURITY;
  DROP POLICY IF EXISTS "owners_manage_templates" ON notification_templates;
  CREATE POLICY "owners_manage_templates" ON notification_templates FOR ALL USING (true);
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'notification_templates section failed: %. Continuing...', SQLERRM;
END $$;


-- ============================================================
-- 2. SYSTEM AUDIT LOGS
-- Table already exists with columns: user_id, action, table_name, record_id, old_value, new_value, ip_address
-- Component has been updated to use these real column names.
-- We only enable RLS and add access policies here.
-- ============================================================
DO $$
BEGIN
  ALTER TABLE system_audit_logs ENABLE ROW LEVEL SECURITY;
  DROP POLICY IF EXISTS "audit_logs_readable"   ON system_audit_logs;
  CREATE POLICY "audit_logs_readable"   ON system_audit_logs FOR SELECT USING (true);
  DROP POLICY IF EXISTS "audit_logs_insertable" ON system_audit_logs;
  CREATE POLICY "audit_logs_insertable" ON system_audit_logs FOR INSERT WITH CHECK (true);
  BEGIN
    CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id  ON system_audit_logs(user_id);
  EXCEPTION WHEN OTHERS THEN NULL;
  END;
  BEGIN
    CREATE INDEX IF NOT EXISTS idx_audit_logs_created ON system_audit_logs(created_at DESC);
  EXCEPTION WHEN OTHERS THEN NULL;
  END;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'system_audit_logs section failed: %. Continuing...', SQLERRM;
END $$;


-- ============================================================
-- 3. RECONNECTION REQUESTS
-- ============================================================
DO $$
BEGIN
  CREATE TABLE IF NOT EXISTS reconnection_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid()
  );
  ALTER TABLE reconnection_requests ADD COLUMN IF NOT EXISTS admin_id          UUID;
  ALTER TABLE reconnection_requests ADD COLUMN IF NOT EXISTS phone_number      VARCHAR(20);
  ALTER TABLE reconnection_requests ADD COLUMN IF NOT EXISTS transaction_code  VARCHAR(50);
  ALTER TABLE reconnection_requests ADD COLUMN IF NOT EXISTS mpesa_message     TEXT;
  ALTER TABLE reconnection_requests ADD COLUMN IF NOT EXISTS mac_address       VARCHAR(50);
  ALTER TABLE reconnection_requests ADD COLUMN IF NOT EXISTS ip_address        VARCHAR(50);
  ALTER TABLE reconnection_requests ADD COLUMN IF NOT EXISTS status            VARCHAR(20)  DEFAULT 'pending';
  ALTER TABLE reconnection_requests ADD COLUMN IF NOT EXISTS amount            DECIMAL(10,2);
  ALTER TABLE reconnection_requests ADD COLUMN IF NOT EXISTS mpesa_account     VARCHAR(100);
  ALTER TABLE reconnection_requests ADD COLUMN IF NOT EXISTS notes             TEXT;
  ALTER TABLE reconnection_requests ADD COLUMN IF NOT EXISTS is_trial          BOOLEAN      DEFAULT false;
  ALTER TABLE reconnection_requests ADD COLUMN IF NOT EXISTS is_session        BOOLEAN      DEFAULT false;
  ALTER TABLE reconnection_requests ADD COLUMN IF NOT EXISTS completed_at      TIMESTAMPTZ;
  ALTER TABLE reconnection_requests ADD COLUMN IF NOT EXISTS created_at        TIMESTAMPTZ  DEFAULT NOW();
  ALTER TABLE reconnection_requests ADD COLUMN IF NOT EXISTS updated_at        TIMESTAMPTZ  DEFAULT NOW();
  BEGIN ALTER TABLE reconnection_requests ALTER COLUMN admin_id     DROP NOT NULL; EXCEPTION WHEN OTHERS THEN NULL; END;
  BEGIN ALTER TABLE reconnection_requests ALTER COLUMN phone_number DROP NOT NULL; EXCEPTION WHEN OTHERS THEN NULL; END;
  BEGIN ALTER TABLE reconnection_requests ALTER COLUMN status       DROP NOT NULL; EXCEPTION WHEN OTHERS THEN NULL; END;
  BEGIN CREATE INDEX IF NOT EXISTS idx_reconnection_admin  ON reconnection_requests(admin_id);  EXCEPTION WHEN OTHERS THEN NULL; END;
  BEGIN CREATE INDEX IF NOT EXISTS idx_reconnection_status ON reconnection_requests(status);     EXCEPTION WHEN OTHERS THEN NULL; END;
  ALTER TABLE reconnection_requests ENABLE ROW LEVEL SECURITY;
  DROP POLICY IF EXISTS "admins_own_reconnections" ON reconnection_requests;
  CREATE POLICY "admins_own_reconnections" ON reconnection_requests FOR ALL USING (true);
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'reconnection_requests section failed: %. Continuing...', SQLERRM;
END $$;


-- ============================================================
-- 4. SMS SETTINGS
-- ============================================================
DO $$
BEGIN
  CREATE TABLE IF NOT EXISTS sms_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid()
  );
  ALTER TABLE sms_settings ADD COLUMN IF NOT EXISTS admin_id          UUID;
  ALTER TABLE sms_settings ADD COLUMN IF NOT EXISTS enabled           BOOLEAN     DEFAULT false;
  ALTER TABLE sms_settings ADD COLUMN IF NOT EXISTS provider          VARCHAR(50) DEFAULT 'twilio';
  ALTER TABLE sms_settings ADD COLUMN IF NOT EXISTS sender_number     VARCHAR(20);
  ALTER TABLE sms_settings ADD COLUMN IF NOT EXISTS username          VARCHAR(100);
  ALTER TABLE sms_settings ADD COLUMN IF NOT EXISTS api_key_encrypted TEXT;
  ALTER TABLE sms_settings ADD COLUMN IF NOT EXISTS message_template  TEXT        DEFAULT 'Your Wi-Fi package will expire on {expiry_date}. Please renew to continue service.';
  ALTER TABLE sms_settings ADD COLUMN IF NOT EXISTS created_at        TIMESTAMPTZ DEFAULT NOW();
  ALTER TABLE sms_settings ADD COLUMN IF NOT EXISTS updated_at        TIMESTAMPTZ DEFAULT NOW();
  BEGIN ALTER TABLE sms_settings ALTER COLUMN enabled          DROP NOT NULL; EXCEPTION WHEN OTHERS THEN NULL; END;
  BEGIN ALTER TABLE sms_settings ALTER COLUMN provider         DROP NOT NULL; EXCEPTION WHEN OTHERS THEN NULL; END;
  BEGIN ALTER TABLE sms_settings ALTER COLUMN message_template DROP NOT NULL; EXCEPTION WHEN OTHERS THEN NULL; END;
  BEGIN
    IF NOT EXISTS (
      SELECT 1 FROM pg_constraint
      WHERE conname = 'sms_settings_admin_id_key' AND conrelid = 'sms_settings'::regclass
    ) THEN
      ALTER TABLE sms_settings ADD CONSTRAINT sms_settings_admin_id_key UNIQUE (admin_id);
    END IF;
  EXCEPTION WHEN OTHERS THEN NULL;
  END;
  ALTER TABLE sms_settings ENABLE ROW LEVEL SECURITY;
  DROP POLICY IF EXISTS "admins_own_sms_settings" ON sms_settings;
  CREATE POLICY "admins_own_sms_settings" ON sms_settings FOR ALL USING (true);
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'sms_settings section failed: %. Continuing...', SQLERRM;
END $$;


-- ============================================================
-- 5. SMS LOGS
-- ============================================================
DO $$
BEGIN
  CREATE TABLE IF NOT EXISTS sms_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid()
  );
  ALTER TABLE sms_logs ADD COLUMN IF NOT EXISTS admin_id      UUID;
  ALTER TABLE sms_logs ADD COLUMN IF NOT EXISTS recipient     VARCHAR(20);
  ALTER TABLE sms_logs ADD COLUMN IF NOT EXISTS message       TEXT;
  ALTER TABLE sms_logs ADD COLUMN IF NOT EXISTS status        VARCHAR(20) DEFAULT 'pending';
  ALTER TABLE sms_logs ADD COLUMN IF NOT EXISTS type          VARCHAR(20) DEFAULT 'manual';
  ALTER TABLE sms_logs ADD COLUMN IF NOT EXISTS error_message TEXT;
  ALTER TABLE sms_logs ADD COLUMN IF NOT EXISTS created_at    TIMESTAMPTZ DEFAULT NOW();
  BEGIN ALTER TABLE sms_logs ALTER COLUMN recipient DROP NOT NULL; EXCEPTION WHEN OTHERS THEN NULL; END;
  BEGIN ALTER TABLE sms_logs ALTER COLUMN message   DROP NOT NULL; EXCEPTION WHEN OTHERS THEN NULL; END;
  BEGIN CREATE INDEX IF NOT EXISTS idx_sms_logs_admin ON sms_logs(admin_id); EXCEPTION WHEN OTHERS THEN NULL; END;
  ALTER TABLE sms_logs ENABLE ROW LEVEL SECURITY;
  DROP POLICY IF EXISTS "admins_own_sms_logs" ON sms_logs;
  CREATE POLICY "admins_own_sms_logs" ON sms_logs FOR ALL USING (true);
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'sms_logs section failed: %. Continuing...', SQLERRM;
END $$;


-- ============================================================
-- 6. WIFI SETTINGS
-- ============================================================
DO $$
BEGIN
  CREATE TABLE IF NOT EXISTS wifi_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid()
  );
  ALTER TABLE wifi_settings ADD COLUMN IF NOT EXISTS admin_id        UUID;
  ALTER TABLE wifi_settings ADD COLUMN IF NOT EXISTS hotspot_title   VARCHAR(100) DEFAULT 'WiFi Access Portal';
  ALTER TABLE wifi_settings ADD COLUMN IF NOT EXISTS enable_trial    BOOLEAN      DEFAULT true;
  ALTER TABLE wifi_settings ADD COLUMN IF NOT EXISTS trial_minutes   INTEGER      DEFAULT 3;
  ALTER TABLE wifi_settings ADD COLUMN IF NOT EXISTS enable_vouchers BOOLEAN      DEFAULT false;
  ALTER TABLE wifi_settings ADD COLUMN IF NOT EXISTS description     TEXT         DEFAULT 'Welcome to our WiFi service';
  ALTER TABLE wifi_settings ADD COLUMN IF NOT EXISTS theme_color     VARCHAR(20)  DEFAULT '#ef4444';
  ALTER TABLE wifi_settings ADD COLUMN IF NOT EXISTS faq_json        JSONB        DEFAULT '[]';
  ALTER TABLE wifi_settings ADD COLUMN IF NOT EXISTS contact_phone   VARCHAR(20)  DEFAULT '';
  ALTER TABLE wifi_settings ADD COLUMN IF NOT EXISTS contact_email   VARCHAR(100) DEFAULT '';
  ALTER TABLE wifi_settings ADD COLUMN IF NOT EXISTS created_at      TIMESTAMPTZ  DEFAULT NOW();
  ALTER TABLE wifi_settings ADD COLUMN IF NOT EXISTS updated_at      TIMESTAMPTZ  DEFAULT NOW();
  BEGIN ALTER TABLE wifi_settings ALTER COLUMN hotspot_title   DROP NOT NULL; EXCEPTION WHEN OTHERS THEN NULL; END;
  BEGIN ALTER TABLE wifi_settings ALTER COLUMN enable_trial    DROP NOT NULL; EXCEPTION WHEN OTHERS THEN NULL; END;
  BEGIN ALTER TABLE wifi_settings ALTER COLUMN trial_minutes   DROP NOT NULL; EXCEPTION WHEN OTHERS THEN NULL; END;
  BEGIN ALTER TABLE wifi_settings ALTER COLUMN enable_vouchers DROP NOT NULL; EXCEPTION WHEN OTHERS THEN NULL; END;
  BEGIN ALTER TABLE wifi_settings ALTER COLUMN description     DROP NOT NULL; EXCEPTION WHEN OTHERS THEN NULL; END;
  BEGIN ALTER TABLE wifi_settings ALTER COLUMN theme_color     DROP NOT NULL; EXCEPTION WHEN OTHERS THEN NULL; END;
  BEGIN ALTER TABLE wifi_settings ALTER COLUMN faq_json        DROP NOT NULL; EXCEPTION WHEN OTHERS THEN NULL; END;
  BEGIN
    IF NOT EXISTS (
      SELECT 1 FROM pg_constraint
      WHERE conname = 'wifi_settings_admin_id_key' AND conrelid = 'wifi_settings'::regclass
    ) THEN
      ALTER TABLE wifi_settings ADD CONSTRAINT wifi_settings_admin_id_key UNIQUE (admin_id);
    END IF;
  EXCEPTION WHEN OTHERS THEN NULL;
  END;
  ALTER TABLE wifi_settings ENABLE ROW LEVEL SECURITY;
  DROP POLICY IF EXISTS "admins_own_wifi_settings" ON wifi_settings;
  CREATE POLICY "admins_own_wifi_settings" ON wifi_settings FOR ALL USING (true);
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'wifi_settings section failed: %. Continuing...', SQLERRM;
END $$;


-- ============================================================
-- 7. PAYMENT REQUESTS
-- ============================================================
DO $$
BEGIN
  CREATE TABLE IF NOT EXISTS payment_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid()
  );
  ALTER TABLE payment_requests ADD COLUMN IF NOT EXISTS admin_id   UUID;
  ALTER TABLE payment_requests ADD COLUMN IF NOT EXISTS phone      VARCHAR(20);
  ALTER TABLE payment_requests ADD COLUMN IF NOT EXISTS amount     DECIMAL(10,2);
  ALTER TABLE payment_requests ADD COLUMN IF NOT EXISTS status     VARCHAR(20) DEFAULT 'pending';
  ALTER TABLE payment_requests ADD COLUMN IF NOT EXISTS notes      TEXT;
  ALTER TABLE payment_requests ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();
  ALTER TABLE payment_requests ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();
  BEGIN ALTER TABLE payment_requests ALTER COLUMN phone  DROP NOT NULL; EXCEPTION WHEN OTHERS THEN NULL; END;
  BEGIN ALTER TABLE payment_requests ALTER COLUMN amount DROP NOT NULL; EXCEPTION WHEN OTHERS THEN NULL; END;
  BEGIN ALTER TABLE payment_requests ALTER COLUMN status DROP NOT NULL; EXCEPTION WHEN OTHERS THEN NULL; END;
  BEGIN CREATE INDEX IF NOT EXISTS idx_payment_requests_admin ON payment_requests(admin_id); EXCEPTION WHEN OTHERS THEN NULL; END;
  ALTER TABLE payment_requests ENABLE ROW LEVEL SECURITY;
  DROP POLICY IF EXISTS "payment_requests_policy" ON payment_requests;
  CREATE POLICY "payment_requests_policy" ON payment_requests FOR ALL USING (true);
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'payment_requests section failed: %. Continuing...', SQLERRM;
END $$;


-- ============================================================
-- 8. SUBSCRIPTION TIERS
-- ============================================================
DO $$
BEGIN
  CREATE TABLE IF NOT EXISTS subscription_tiers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid()
  );
  ALTER TABLE subscription_tiers ADD COLUMN IF NOT EXISTS name                  VARCHAR(100);
  ALTER TABLE subscription_tiers ADD COLUMN IF NOT EXISTS description           TEXT;
  ALTER TABLE subscription_tiers ADD COLUMN IF NOT EXISTS monthly_fee           DECIMAL(10,2) DEFAULT 0;
  ALTER TABLE subscription_tiers ADD COLUMN IF NOT EXISTS max_revenue_threshold DECIMAL(12,2);
  ALTER TABLE subscription_tiers ADD COLUMN IF NOT EXISTS features              JSONB         DEFAULT '{}';
  ALTER TABLE subscription_tiers ADD COLUMN IF NOT EXISTS created_at            TIMESTAMPTZ   DEFAULT NOW();
  ALTER TABLE subscription_tiers ADD COLUMN IF NOT EXISTS updated_at            TIMESTAMPTZ   DEFAULT NOW();
  BEGIN ALTER TABLE subscription_tiers ALTER COLUMN name        DROP NOT NULL; EXCEPTION WHEN OTHERS THEN NULL; END;
  BEGIN ALTER TABLE subscription_tiers ALTER COLUMN monthly_fee DROP NOT NULL; EXCEPTION WHEN OTHERS THEN NULL; END;
  BEGIN
    INSERT INTO subscription_tiers (name, description, monthly_fee, features) VALUES
      ('Basic',      'For small ISPs - up to 50 customers',    1500.00, '{"max_customers":50,"sms":false,"analytics":false}'),
      ('Standard',   'For growing ISPs - up to 200 customers', 3000.00, '{"max_customers":200,"sms":true,"analytics":false}'),
      ('Enterprise', 'Unlimited customers and full features',   6000.00, '{"max_customers":-1,"sms":true,"analytics":true}');
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'Skipped seeding subscription_tiers: %', SQLERRM;
  END;
  ALTER TABLE subscription_tiers ENABLE ROW LEVEL SECURITY;
  DROP POLICY IF EXISTS "tiers_readable" ON subscription_tiers;
  CREATE POLICY "tiers_readable" ON subscription_tiers FOR ALL USING (true);
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'subscription_tiers section failed: %. Continuing...', SQLERRM;
END $$;


-- ============================================================
-- 9. ADMIN SUBSCRIPTIONS
-- ============================================================
DO $$
BEGIN
  CREATE TABLE IF NOT EXISTS admin_subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid()
  );
  ALTER TABLE admin_subscriptions ADD COLUMN IF NOT EXISTS admin_id          UUID;
  ALTER TABLE admin_subscriptions ADD COLUMN IF NOT EXISTS tier_id           UUID;
  ALTER TABLE admin_subscriptions ADD COLUMN IF NOT EXISTS status            VARCHAR(20)   DEFAULT 'trial';
  ALTER TABLE admin_subscriptions ADD COLUMN IF NOT EXISTS last_payment_date TIMESTAMPTZ;
  ALTER TABLE admin_subscriptions ADD COLUMN IF NOT EXISTS next_due_date     TIMESTAMPTZ;
  ALTER TABLE admin_subscriptions ADD COLUMN IF NOT EXISTS grace_period_days INTEGER       DEFAULT 7;
  ALTER TABLE admin_subscriptions ADD COLUMN IF NOT EXISTS total_revenue     DECIMAL(12,2) DEFAULT 0;
  ALTER TABLE admin_subscriptions ADD COLUMN IF NOT EXISTS created_at        TIMESTAMPTZ   DEFAULT NOW();
  ALTER TABLE admin_subscriptions ADD COLUMN IF NOT EXISTS updated_at        TIMESTAMPTZ   DEFAULT NOW();
  BEGIN ALTER TABLE admin_subscriptions ALTER COLUMN status            DROP NOT NULL; EXCEPTION WHEN OTHERS THEN NULL; END;
  BEGIN ALTER TABLE admin_subscriptions ALTER COLUMN grace_period_days DROP NOT NULL; EXCEPTION WHEN OTHERS THEN NULL; END;
  BEGIN ALTER TABLE admin_subscriptions ALTER COLUMN total_revenue     DROP NOT NULL; EXCEPTION WHEN OTHERS THEN NULL; END;
  BEGIN
    IF NOT EXISTS (
      SELECT 1 FROM pg_constraint
      WHERE conname = 'admin_subscriptions_admin_id_key' AND conrelid = 'admin_subscriptions'::regclass
    ) THEN
      ALTER TABLE admin_subscriptions ADD CONSTRAINT admin_subscriptions_admin_id_key UNIQUE (admin_id);
    END IF;
  EXCEPTION WHEN OTHERS THEN NULL;
  END;
  ALTER TABLE admin_subscriptions ENABLE ROW LEVEL SECURITY;
  DROP POLICY IF EXISTS "admin_subscriptions_policy" ON admin_subscriptions;
  CREATE POLICY "admin_subscriptions_policy" ON admin_subscriptions FOR ALL USING (true);
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'admin_subscriptions section failed: %. Continuing...', SQLERRM;
END $$;


-- ============================================================
-- 10. SYSTEM SETTINGS
-- ============================================================
DO $$
BEGIN
  CREATE TABLE IF NOT EXISTS system_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid()
  );
  ALTER TABLE system_settings ADD COLUMN IF NOT EXISTS setting_key   VARCHAR(100);
  ALTER TABLE system_settings ADD COLUMN IF NOT EXISTS setting_value JSONB;
  ALTER TABLE system_settings ADD COLUMN IF NOT EXISTS description   TEXT;
  ALTER TABLE system_settings ADD COLUMN IF NOT EXISTS created_at    TIMESTAMPTZ DEFAULT NOW();
  ALTER TABLE system_settings ADD COLUMN IF NOT EXISTS updated_at    TIMESTAMPTZ DEFAULT NOW();
  BEGIN ALTER TABLE system_settings ALTER COLUMN setting_key   DROP NOT NULL; EXCEPTION WHEN OTHERS THEN NULL; END;
  BEGIN ALTER TABLE system_settings ALTER COLUMN setting_value DROP NOT NULL; EXCEPTION WHEN OTHERS THEN NULL; END;
  BEGIN
    IF NOT EXISTS (
      SELECT 1 FROM pg_constraint
      WHERE conname = 'system_settings_setting_key_key' AND conrelid = 'system_settings'::regclass
    ) THEN
      ALTER TABLE system_settings ADD CONSTRAINT system_settings_setting_key_key UNIQUE (setting_key);
    END IF;
  EXCEPTION WHEN OTHERS THEN NULL;
  END;
  BEGIN
    INSERT INTO system_settings (setting_key, setting_value, description) VALUES
      ('default_grace_period', '{"days": 7}',                  'Grace period before suspending unpaid subscriptions'),
      ('platform_name',        '"Kingstone WiFi Billing"',      'Platform display name'),
      ('support_email',        '"support@kingstonewifi.co.ke"', 'Support contact email')
    ON CONFLICT (setting_key) DO NOTHING;
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'Skipped seeding system_settings: %', SQLERRM;
  END;
  ALTER TABLE system_settings ENABLE ROW LEVEL SECURITY;
  DROP POLICY IF EXISTS "system_settings_policy" ON system_settings;
  CREATE POLICY "system_settings_policy" ON system_settings FOR ALL USING (true);
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'system_settings section failed: %. Continuing...', SQLERRM;
END $$;
