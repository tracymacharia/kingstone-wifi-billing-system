-- ============================================
-- MAINTENANCE PROCEDURES
-- Run these periodically to keep the system clean
-- ============================================

-- Clean up expired OTPs (run daily via cron or scheduler)
-- This removes OTPs older than 7 days or already expired
SELECT cleanup_expired_otps();

-- ============================================
-- MONITORING QUERIES
-- ============================================

-- Check OTP usage statistics
SELECT 
  COUNT(*) as total_otps,
  COUNT(*) FILTER (WHERE is_used = TRUE) as used_otps,
  COUNT(*) FILTER (WHERE is_used = FALSE AND expires_at > NOW()) as valid_otps,
  COUNT(*) FILTER (WHERE expires_at < NOW()) as expired_otps,
  ROUND(100.0 * COUNT(*) FILTER (WHERE is_used = TRUE) / NULLIF(COUNT(*), 0), 2) as usage_rate_percent
FROM otp_verifications;

-- Check recent registrations (last 7 days)
SELECT 
  DATE(created_at) as registration_date,
  COUNT(*) as new_owners
FROM owners
WHERE created_at >= NOW() - INTERVAL '7 days'
GROUP BY DATE(created_at)
ORDER BY registration_date DESC;

-- Check trial status
SELECT 
  subscription_status,
  COUNT(*) as count,
  ROUND(100.0 * COUNT(*) / SUM(COUNT(*)) OVER (), 2) as percentage
FROM owners
GROUP BY subscription_status;

-- ============================================
-- SETUP CRON JOB (Supabase pg_cron extension)
-- ============================================

-- Enable pg_cron extension if not already enabled
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Schedule daily OTP cleanup at 2 AM UTC
SELECT cron.schedule(
  'daily-otp-cleanup',
  '0 2 * * *',
  'SELECT cleanup_expired_otps()'
);

-- View scheduled jobs
SELECT * FROM cron.job;

-- Remove a scheduled job
-- SELECT cron.unschedule('daily-otp-cleanup');

-- ============================================
-- SECURITY AUDIT QUERIES
-- ============================================

-- Check for accounts with multiple failed login attempts
SELECT 
  sc.username,
  sc.role,
  sc.failed_login_attempts,
  sc.locked_until,
  sc.last_login_at
FROM system_credentials sc
WHERE sc.failed_login_attempts > 0
ORDER BY sc.failed_login_attempts DESC, sc.created_at DESC
LIMIT 20;

-- Check for locked accounts
SELECT 
  sc.username,
  sc.role,
  sc.locked_until,
  o.business_name,
  p.email
FROM system_credentials sc
LEFT JOIN owners o ON sc.owner_id = o.id
LEFT JOIN admins a ON sc.admin_id = a.id
LEFT JOIN profiles p ON (o.profile_id = p.id OR a.profile_id = p.id)
WHERE sc.is_locked = TRUE AND sc.locked_until > NOW()
ORDER BY sc.locked_until DESC;

-- ============================================
-- BACKUP PROCEDURES
-- ============================================

-- Export recent registrations (for backup)
SELECT 
  o.id as owner_id,
  o.business_name,
  o.subscription_status,
  o.is_trial,
  o.trial_expires_at,
  o.created_at,
  p.full_name,
  p.email,
  p.phone
FROM owners o
JOIN profiles p ON o.profile_id = p.id
WHERE o.created_at >= NOW() - INTERVAL '30 days'
ORDER BY o.created_at DESC;

-- Export admin accounts (for backup)
SELECT 
  a.id as admin_id,
  a.username,
  a.email,
  a.phone,
  a.subscription_status,
  a.is_trial,
  a.trial_expires_at,
  a.created_at,
  o.business_name as owner_business
FROM admins a
JOIN owners o ON a.owner_id = o.id
ORDER BY a.created_at DESC;
