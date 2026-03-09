-- ============================================
-- CHECK: Verify owner_subscription_settings table exists
-- ============================================

-- Check if table exists
SELECT 
  schemaname,
  tablename
FROM pg_tables 
WHERE tablename = 'owner_subscription_settings';

-- Check table structure
SELECT 
  column_name,
  data_type,
  column_default
FROM information_schema.columns
WHERE table_name = 'owner_subscription_settings'
ORDER BY ordinal_position;

-- If table doesn't exist, create it
CREATE TABLE IF NOT EXISTS owner_subscription_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL UNIQUE REFERENCES owners(id) ON DELETE CASCADE,
  hotspot_below_10000 DECIMAL(10,2) NOT NULL DEFAULT 500,
  hotspot_above_10000 DECIMAL(10,2) NOT NULL DEFAULT 1200,
  ppoe_static_price DECIMAL(10,2) NOT NULL DEFAULT 2500,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert default settings for existing owner
INSERT INTO owner_subscription_settings (owner_id, hotspot_below_10000, hotspot_above_10000, ppoe_static_price)
VALUES ('1a9af26c-029e-4975-83bc-e0d8ee24c492', 500, 1200, 2500)
ON CONFLICT (owner_id) DO NOTHING;

-- Verify the data
SELECT * FROM owner_subscription_settings;
