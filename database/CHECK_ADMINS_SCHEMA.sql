-- ============================================
-- CHECK: Actual Admins Table Schema
-- Run this to see the real column names
-- ============================================

SELECT 
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_name = 'admins'
ORDER BY ordinal_position;

-- Also check owners table
SELECT 
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_name = 'owners'
ORDER BY ordinal_position;
