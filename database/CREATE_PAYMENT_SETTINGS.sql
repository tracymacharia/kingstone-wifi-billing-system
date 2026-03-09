-- ============================================
-- CREATE: owner_payment_settings table
-- For storing MPESA payment configuration
-- ============================================

CREATE TABLE IF NOT EXISTS owner_payment_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL REFERENCES owners(id) ON DELETE CASCADE,
  method TEXT CHECK (method IN ('paybill', 'till')),
  paybill_number TEXT,
  account_number TEXT,
  till_number TEXT,
  description TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_owner_payment_settings_owner ON owner_payment_settings(owner_id);

-- Insert default payment settings for existing owner
INSERT INTO owner_payment_settings (owner_id, method, paybill_number, account_number, till_number, description, is_active)
VALUES (
  '1a9af26c-029e-4975-83bc-e0d8ee24c492',
  'paybill',
  NULL,
  NULL,
  NULL,
  'Default payment settings',
  TRUE
)
ON CONFLICT DO NOTHING;

-- Verify the table was created
SELECT 
  tablename,
  schemaname
FROM pg_tables 
WHERE tablename = 'owner_payment_settings';

-- Show current settings
SELECT * FROM owner_payment_settings;
