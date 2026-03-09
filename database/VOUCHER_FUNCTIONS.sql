-- ============================================
-- Kingstone WiFi Billing System - Voucher Management Functions
-- Complete voucher lifecycle management
-- ============================================

-- ============================================
-- VOUCHER GENERATION FUNCTIONS
-- ============================================

-- Generate random voucher code
CREATE OR REPLACE FUNCTION generate_voucher_code(
  prefix TEXT DEFAULT '',
  length INTEGER DEFAULT 8
)
RETURNS TEXT AS $$
DECLARE
  chars TEXT := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; -- Excluding confusing chars (I,1,O,0)
  result TEXT := prefix;
  i INTEGER;
BEGIN
  FOR i IN 1..length LOOP
    result := result || substring(chars from floor(random() * length(chars) + 1)::int for 1);
  END LOOP;
  
  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Generate random password
CREATE OR REPLACE FUNCTION generate_voucher_password(length INTEGER DEFAULT 8)
RETURNS TEXT AS $$
DECLARE
  chars TEXT := 'abcdefghijkmnopqrstuvwxyz23456789';
  result TEXT := '';
  i INTEGER;
BEGIN
  FOR i IN 1..length LOOP
    result := result || substring(chars from floor(random() * length(chars) + 1)::int for 1);
  END LOOP;
  
  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- BULK VOUCHER GENERATION
-- ============================================

-- Generate multiple vouchers at once
CREATE OR REPLACE FUNCTION generate_vouchers(
  p_admin_id UUID,
  p_package_id UUID,
  p_quantity INTEGER DEFAULT 1,
  p_code_prefix TEXT DEFAULT '',
  p_code_length INTEGER DEFAULT 8,
  p_password_length INTEGER DEFAULT 8,
  p_validity_days INTEGER DEFAULT 30
)
RETURNS JSON AS $$
DECLARE
  v_vouchers JSON[];
  v_voucher_record RECORD;
  v_code TEXT;
  v_password TEXT;
  v_username TEXT;
  i INTEGER;
  v_package packages%ROWTYPE;
  v_expires_at TIMESTAMPTZ;
BEGIN
  -- Get package details
  SELECT * INTO v_package FROM packages WHERE id = p_package_id;
  
  IF v_package.id IS NULL THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Package not found'
    );
  END IF;

  -- Calculate expiry date
  v_expires_at := NOW() + (p_validity_days || ' days')::interval;

  -- Generate vouchers
  FOR i IN 1..p_quantity LOOP
    -- Generate unique code
    BEGIN
      LOOP
        v_code := generate_voucher_code(p_code_prefix, p_code_length);
        v_username := v_code; -- Username same as code for simplicity
        
        -- Check if code already exists
        IF NOT EXISTS (SELECT 1 FROM vouchers WHERE voucher_code = v_code) THEN
          EXIT;
        END IF;
      END LOOP;
    EXCEPTION WHEN OTHERS THEN
      v_code := generate_voucher_code(p_code_prefix, p_code_length) || '_' || i;
      v_username := v_code;
    END;

    -- Generate password
    v_password := generate_voucher_password(p_password_length);

    -- Insert voucher
    INSERT INTO vouchers (
      admin_id,
      package_id,
      voucher_code,
      username,
      password,
      status,
      expires_at
    ) VALUES (
      p_admin_id,
      p_package_id,
      v_code,
      v_username,
      v_password,
      'unused',
      v_expires_at
    )
    RETURNING * INTO v_voucher_record;

    -- Add to result array
    v_vouchers := array_append(
      v_vouchers,
      json_build_object(
        'id', v_voucher_record.id,
        'voucher_code', v_voucher_record.voucher_code,
        'username', v_voucher_record.username,
        'password', v_voucher_record.password,
        'package_name', v_package.name,
        'price', v_package.price,
        'expires_at', v_voucher_record.expires_at,
        'status', v_voucher_record.status
      )
    );
  END LOOP;

  RETURN json_build_object(
    'success', true,
    'message', format('Generated %s vouchers successfully', p_quantity),
    'count', p_quantity,
    'vouchers', v_vouchers
  );
EXCEPTION
  WHEN OTHERS THEN
    RETURN json_build_object(
      'success', false,
      'error', SQLERRM
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- SINGLE VOUCHER OPERATIONS
-- ============================================

-- Generate single voucher
CREATE OR REPLACE FUNCTION generate_single_voucher(
  p_admin_id UUID,
  p_package_id UUID,
  p_custom_code TEXT DEFAULT NULL,
  p_custom_password TEXT DEFAULT NULL,
  p_validity_days INTEGER DEFAULT 30
)
RETURNS JSON AS $$
DECLARE
  v_code TEXT;
  v_password TEXT;
  v_username TEXT;
  v_package packages%ROWTYPE;
  v_voucher vouchers%ROWTYPE;
  v_expires_at TIMESTAMPTZ;
BEGIN
  -- Get package details
  SELECT * INTO v_package FROM packages WHERE id = p_package_id;
  
  IF v_package.id IS NULL THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Package not found'
    );
  END IF;

  -- Use custom code or generate one
  IF p_custom_code IS NOT NULL THEN
    v_code := p_custom_code;
    v_username := p_custom_code;
  ELSE
    v_code := generate_voucher_code('', 8);
    v_username := v_code;
  END IF;

  -- Use custom password or generate one
  IF p_custom_password IS NOT NULL THEN
    v_password := p_custom_password;
  ELSE
    v_password := generate_voucher_password(8);
  END IF;

  -- Calculate expiry date
  v_expires_at := NOW() + (p_validity_days || ' days')::interval;

  -- Insert voucher
  INSERT INTO vouchers (
    admin_id,
    package_id,
    voucher_code,
    username,
    password,
    status,
    expires_at
  ) VALUES (
    p_admin_id,
    p_package_id,
    v_code,
    v_username,
    v_password,
    'unused',
    v_expires_at
  )
  RETURNING * INTO v_voucher;

  RETURN json_build_object(
    'success', true,
    'message', 'Voucher generated successfully',
    'voucher', json_build_object(
      'id', v_voucher.id,
      'voucher_code', v_voucher.voucher_code,
      'username', v_voucher.username,
      'password', v_voucher.password,
      'package_name', v_package.name,
      'price', v_package.price,
      'expires_at', v_voucher.expires_at,
      'status', v_voucher.status
    )
  );
EXCEPTION
  WHEN unique_violation THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Voucher code already exists. Please try a different code.'
    );
  WHEN OTHERS THEN
    RETURN json_build_object(
      'success', false,
      'error', SQLERRM
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- VOUCHER VERIFICATION
-- ============================================

-- Verify voucher and activate
CREATE OR REPLACE FUNCTION verify_and_activate_voucher(
  p_voucher_code TEXT,
  p_password TEXT,
  p_admin_id UUID
)
RETURNS JSON AS $$
DECLARE
  v_voucher vouchers%ROWTYPE;
  v_package packages%ROWTYPE;
  v_wifi_user_id UUID;
  v_result JSON;
BEGIN
  -- Get voucher details
  SELECT * INTO v_voucher
  FROM vouchers
  WHERE voucher_code = p_voucher_code
    AND admin_id = p_admin_id;

  -- Check if voucher exists
  IF v_voucher.id IS NULL THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Invalid voucher code'
    );
  END IF;

  -- Check if voucher is already used
  IF v_voucher.status = 'used' THEN
    RETURN json_build_object(
      'success', false,
      'error', 'This voucher has already been used'
    );
  END IF;

  -- Check if voucher is expired
  IF v_voucher.expires_at < NOW() THEN
    RETURN json_build_object(
      'success', false,
      'error', 'This voucher has expired'
    );
  END IF;

  -- Verify password
  IF v_voucher.password != p_password THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Invalid voucher password'
    );
  END IF;

  -- Get package details
  SELECT * INTO v_package FROM packages WHERE id = v_voucher.package_id;

  IF v_package.id IS NULL THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Package not found for this voucher'
    );
  END IF;

  -- Create WiFi user
  INSERT INTO wifi_users (
    admin_id,
    username,
    password,
    current_package_id,
    package_expires_at,
    is_active
  ) VALUES (
    p_admin_id,
    v_voucher.username,
    v_voucher.password,
    v_voucher.package_id,
    v_voucher.expires_at,
    TRUE
  )
  RETURNING id INTO v_wifi_user_id;

  -- Mark voucher as used
  UPDATE vouchers
  SET 
    status = 'used',
    used_at = NOW(),
    updated_at = NOW()
  WHERE id = v_voucher.id;

  RETURN json_build_object(
    'success', true,
    'message', 'Voucher activated successfully',
    'wifi_user_id', v_wifi_user_id,
    'username', v_voucher.username,
    'password', v_voucher.password,
    'package_name', v_package.name,
    'expires_at', v_voucher.expires_at
  );
EXCEPTION
  WHEN OTHERS THEN
    RETURN json_build_object(
      'success', false,
      'error', SQLERRM
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- VOUCHER MANAGEMENT
-- ============================================

-- Get vouchers by admin
CREATE OR REPLACE FUNCTION get_admin_vouchers(
  p_admin_id UUID,
  p_status TEXT DEFAULT NULL,
  p_limit INTEGER DEFAULT 100,
  p_offset INTEGER DEFAULT 0
)
RETURNS JSON AS $$
DECLARE
  v_vouchers JSON[];
  v_voucher RECORD;
  v_total INTEGER;
BEGIN
  -- Get total count
  SELECT COUNT(*) INTO v_total
  FROM vouchers
  WHERE admin_id = p_admin_id
    AND (p_status IS NULL OR status = p_status);

  -- Get vouchers
  FOR v_voucher IN
    SELECT 
      v.id,
      v.voucher_code,
      v.username,
      v.password,
      v.status,
      v.expires_at,
      v.used_at,
      v.created_at,
      p.name as package_name,
      p.price as package_price,
      p.duration_type,
      p.duration_value
    FROM vouchers v
    JOIN packages p ON v.package_id = p.id
    WHERE v.admin_id = p_admin_id
      AND (p_status IS NULL OR v.status = p_status)
    ORDER BY v.created_at DESC
    LIMIT p_limit OFFSET p_offset
  LOOP
    v_vouchers := array_append(
      v_vouchers,
      json_build_object(
        'id', v_voucher.id,
        'voucher_code', v_voucher.voucher_code,
        'username', v_voucher.username,
        'password', v_voucher.password,
        'status', v_voucher.status,
        'expires_at', v_voucher.expires_at,
        'used_at', v_voucher.used_at,
        'created_at', v_voucher.created_at,
        'package_name', v_voucher.package_name,
        'package_price', v_voucher.package_price,
        'duration_type', v_voucher.duration_type,
        'duration_value', v_voucher.duration_value
      )
    );
  END LOOP;

  RETURN json_build_object(
    'success', true,
    'total', v_total,
    'limit', p_limit,
    'offset', p_offset,
    'vouchers', v_vouchers
  );
EXCEPTION
  WHEN OTHERS THEN
    RETURN json_build_object(
      'success', false,
      'error', SQLERRM
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Delete expired vouchers
CREATE OR REPLACE FUNCTION cleanup_expired_vouchers()
RETURNS INTEGER AS $$
DECLARE
  v_deleted_count INTEGER;
BEGIN
  DELETE FROM vouchers
  WHERE status = 'unused'
    AND expires_at < NOW();

  GET DIAGNOSTICS v_deleted_count = ROW_COUNT;
  RETURN v_deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- VOUCHER STATISTICS
-- ============================================

-- Get voucher statistics for admin
CREATE OR REPLACE FUNCTION get_voucher_statistics(
  p_admin_id UUID
)
RETURNS JSON AS $$
DECLARE
  v_stats JSON;
BEGIN
  SELECT json_build_object(
    'total', COUNT(*),
    'unused', COUNT(*) FILTER (WHERE status = 'unused'),
    'used', COUNT(*) FILTER (WHERE status = 'used'),
    'expired', COUNT(*) FILTER (WHERE status = 'unused' AND expires_at < NOW()),
    'revenue', COALESCE(SUM(p.price) FILTER (WHERE v.status = 'used'), 0)
  ) INTO v_stats
  FROM vouchers v
  LEFT JOIN packages p ON v.package_id = p.id
  WHERE v.admin_id = p_admin_id;

  RETURN json_build_object(
    'success', true,
    'statistics', v_stats
  );
EXCEPTION
  WHEN OTHERS THEN
    RETURN json_build_object(
      'success', false,
      'error', SQLERRM
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- SETUP COMPLETE
-- ============================================
