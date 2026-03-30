-- ============================================================
-- FIX PAYMENTS TABLE - ADD MISSING COLUMNS
-- Run this FIRST in Supabase SQL Editor
-- ============================================================

BEGIN;

-- Add missing columns to payments table
ALTER TABLE payments 
ADD COLUMN IF NOT EXISTS mikrotik_id UUID REFERENCES mikrotiks(id),
ADD COLUMN IF NOT EXISTS transaction_id TEXT,
ADD COLUMN IF NOT EXISTS mpesa_receipt_number TEXT,
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- Add index for transaction_id lookups (used by M-Pesa callback)
CREATE INDEX IF NOT EXISTS idx_payments_transaction_id 
ON payments(transaction_id);

-- Add index for mikrotik_id
CREATE INDEX IF NOT EXISTS idx_payments_mikrotik 
ON payments(mikrotik_id);

-- Add updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_payments_updated_at ON payments;
CREATE TRIGGER update_payments_updated_at
BEFORE UPDATE ON payments
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

COMMIT;

-- Verify
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'payments'
ORDER BY ordinal_position;

SELECT '✅ PAYMENTS TABLE FIXED!' as status;
