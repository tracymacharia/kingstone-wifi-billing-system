-- ============================================
-- UPDATE: Remove trial for owners (admins keep 14-day trial)
-- ============================================

-- Update the existing owner to active (no trial)
UPDATE owners
SET 
  is_trial = FALSE,
  trial_expires_at = NULL,
  trial_activated_at = NULL,
  subscription_status = 'active',
  updated_at = NOW()
WHERE id = '1a9af26c-029e-4975-83bc-e0d8ee24c492';

-- Verify the update
SELECT 
  id,
  business_name,
  is_trial,
  trial_expires_at,
  subscription_status
FROM owners
WHERE id = '1a9af26c-029e-4975-83bc-e0d8ee24c492';

-- Also update the register_owner function to not create owners with trial
-- Find and update the function (if it exists in your database)
-- This is optional - only needed if you're using the register_owner RPC
