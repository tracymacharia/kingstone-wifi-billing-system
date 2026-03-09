-- ============================================
-- Fix: Email Validation in Owner Registration
-- Issue: Duplicate Gmail validation causing errors at final step
-- Solution: Remove duplicate validation, normalize email once
-- ============================================

-- Drop and recreate register_owner function with fixed email handling
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

  -- Clean up used OTPs for this email
  UPDATE otp_verifications
  SET is_used = TRUE, used_at = NOW()
  WHERE email = v_normalized_email AND is_used = FALSE;

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

-- Add comment to document the fix
COMMENT ON FUNCTION register_owner(TEXT, TEXT, TEXT, TEXT, TEXT) IS 
'Owner registration with OTP verification. Email is validated in request_registration_otp, then normalized here.';
