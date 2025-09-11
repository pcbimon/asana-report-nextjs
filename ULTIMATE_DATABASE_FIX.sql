/**
 * ULTIMATE DATABASE FIX for ALL Login Issues
 * This fixes the specific error: "relation 'user_roles' does not exist"
 * 
 * Run this SINGLE file to completely fix the database and enable login
 * This handles all edge cases and ensures a clean database state
 */

-- Step 1: Drop any problematic triggers that might prevent login
DROP TRIGGER IF EXISTS update_user_roles_on_login ON auth.users;
DROP TRIGGER IF EXISTS auto_link_user_role_trigger ON auth.users;

-- Step 2: Ensure the update_updated_at_column function exists
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Step 3: Create departments table if it doesn't exist
CREATE TABLE IF NOT EXISTS departments (
  id SERIAL PRIMARY KEY,
  department_code VARCHAR(20) UNIQUE NOT NULL,
  department_name VARCHAR(100) NOT NULL,
  department_name_th VARCHAR(100) NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Step 4: Create user_roles table if it doesn't exist
CREATE TABLE IF NOT EXISTS user_roles (
  id SERIAL PRIMARY KEY,
  email VARCHAR(255) NOT NULL,
  role_level INTEGER NOT NULL CHECK (role_level >= 1 AND role_level <= 5),
  role_name VARCHAR(50) NOT NULL,
  department_id INTEGER REFERENCES departments(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  UNIQUE(email, department_id)
);

-- Step 5: Create asana_reports table if it doesn't exist
CREATE TABLE IF NOT EXISTS asana_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cache_key VARCHAR(255) UNIQUE NOT NULL,
  report_data JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '1 hour')
);

-- Step 6: Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_departments_code ON departments(department_code);
CREATE INDEX IF NOT EXISTS idx_departments_active ON departments(is_active);
CREATE INDEX IF NOT EXISTS idx_user_roles_email ON user_roles(email);
CREATE INDEX IF NOT EXISTS idx_user_roles_user_id ON user_roles(user_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_role_level ON user_roles(role_level);
CREATE INDEX IF NOT EXISTS idx_user_roles_active ON user_roles(is_active);
CREATE INDEX IF NOT EXISTS idx_user_roles_department ON user_roles(department_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_email_dept ON user_roles(email, department_id);
CREATE INDEX IF NOT EXISTS idx_asana_reports_cache_key ON asana_reports(cache_key);
CREATE INDEX IF NOT EXISTS idx_asana_reports_expires_at ON asana_reports(expires_at);

-- Step 7: Create/recreate safe triggers
DROP TRIGGER IF EXISTS update_departments_updated_at ON departments;
CREATE TRIGGER update_departments_updated_at 
  BEFORE UPDATE ON departments 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_user_roles_updated_at ON user_roles;
CREATE TRIGGER update_user_roles_updated_at 
  BEFORE UPDATE ON user_roles 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_asana_reports_updated_at ON asana_reports;
CREATE TRIGGER update_asana_reports_updated_at 
  BEFORE UPDATE ON asana_reports 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Step 8: Enable Row Level Security
ALTER TABLE departments ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE asana_reports ENABLE ROW LEVEL SECURITY;

-- Step 9: Drop ALL existing policies to ensure clean state
DROP POLICY IF EXISTS "Users can view active departments" ON departments;
DROP POLICY IF EXISTS "Authenticated users can manage departments" ON departments;
DROP POLICY IF EXISTS "Authenticated users can update departments" ON departments;
DROP POLICY IF EXISTS "Authenticated users can delete departments" ON departments;
DROP POLICY IF EXISTS "Admins can manage departments" ON departments;

DROP POLICY IF EXISTS "Users can view own role" ON user_roles;
DROP POLICY IF EXISTS "Authenticated users can manage roles" ON user_roles;
DROP POLICY IF EXISTS "Authenticated users can update roles" ON user_roles;
DROP POLICY IF EXISTS "Authenticated users can delete roles" ON user_roles;
DROP POLICY IF EXISTS "Admins can manage all roles" ON user_roles;

DROP POLICY IF EXISTS "Enable read access for authenticated users" ON asana_reports;
DROP POLICY IF EXISTS "Enable insert access for authenticated users" ON asana_reports;
DROP POLICY IF EXISTS "Enable update access for authenticated users" ON asana_reports;
DROP POLICY IF EXISTS "Enable delete access for authenticated users" ON asana_reports;
DROP POLICY IF EXISTS "Role-based read access for asana_reports" ON asana_reports;
DROP POLICY IF EXISTS "Role-based insert access for asana_reports" ON asana_reports;
DROP POLICY IF EXISTS "Role-based update access for asana_reports" ON asana_reports;
DROP POLICY IF EXISTS "Role-based delete access for asana_reports" ON asana_reports;
DROP POLICY IF EXISTS "Authenticated users with roles can read asana_reports" ON asana_reports;
DROP POLICY IF EXISTS "Authenticated users with roles can insert asana_reports" ON asana_reports;
DROP POLICY IF EXISTS "Authenticated users with roles can update asana_reports" ON asana_reports;
DROP POLICY IF EXISTS "Authenticated users with roles can delete asana_reports" ON asana_reports;

-- Step 10: Create new safe policies for departments
CREATE POLICY "All authenticated users can view departments" ON departments
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "All authenticated users can manage departments" ON departments
  FOR ALL USING (auth.role() = 'authenticated');

-- Step 11: Create new safe policies for user_roles  
CREATE POLICY "All authenticated users can view user_roles" ON user_roles
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "All authenticated users can manage user_roles" ON user_roles
  FOR ALL USING (auth.role() = 'authenticated');

-- Step 12: Create new safe policies for asana_reports
CREATE POLICY "All authenticated users can access asana_reports" ON asana_reports
  FOR ALL USING (auth.role() = 'authenticated');

-- Step 13: Create/recreate functions with correct types
CREATE OR REPLACE FUNCTION get_user_departments(user_email text DEFAULT NULL)
RETURNS TABLE (
  department_id integer,
  department_code varchar(20),
  department_name varchar(100),
  role_level integer,
  role_name varchar(50)
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  target_email text;
BEGIN
  -- Use provided email or get current user's email
  IF user_email IS NULL THEN
    SELECT email INTO target_email FROM auth.users WHERE id = auth.uid();
  ELSE
    target_email := user_email;
  END IF;

  RETURN QUERY
  SELECT 
    d.id as department_id,
    d.department_code,
    d.department_name_th as department_name,
    ur.role_level,
    ur.role_name
  FROM user_roles ur
  JOIN departments d ON ur.department_id = d.id
  WHERE ur.email = target_email 
    AND ur.is_active = true 
    AND d.is_active = true
  ORDER BY ur.role_level DESC, d.department_name_th;
END;
$$;

CREATE OR REPLACE FUNCTION get_user_role(user_email text DEFAULT NULL, dept_id integer DEFAULT NULL)
RETURNS TABLE (
  role_level integer,
  role_name varchar(50),
  department_id integer,
  department_code varchar(20),
  department_name varchar(100),
  is_active boolean,
  can_view_emails text[]
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  target_email text;
  user_role_level integer;
  user_role_name varchar(50);
  user_dept_id integer;
  user_dept_code varchar(20);
  user_dept_name varchar(100);
  user_is_active boolean;
  viewable_emails text[];
BEGIN
  -- Use provided email or get current user's email
  IF user_email IS NULL THEN
    SELECT email INTO target_email FROM auth.users WHERE id = auth.uid();
  ELSE
    target_email := user_email;
  END IF;

  -- Get user role information for the specified department or first available department
  IF dept_id IS NOT NULL THEN
    SELECT ur.role_level, ur.role_name, ur.department_id, d.department_code, d.department_name_th, ur.is_active
    INTO user_role_level, user_role_name, user_dept_id, user_dept_code, user_dept_name, user_is_active
    FROM user_roles ur 
    JOIN departments d ON ur.department_id = d.id
    WHERE ur.email = target_email 
      AND ur.department_id = dept_id 
      AND ur.is_active = true 
      AND d.is_active = true
    LIMIT 1;
  ELSE
    SELECT ur.role_level, ur.role_name, ur.department_id, d.department_code, d.department_name_th, ur.is_active
    INTO user_role_level, user_role_name, user_dept_id, user_dept_code, user_dept_name, user_is_active
    FROM user_roles ur 
    JOIN departments d ON ur.department_id = d.id
    WHERE ur.email = target_email 
      AND ur.is_active = true 
      AND d.is_active = true
    ORDER BY ur.role_level DESC
    LIMIT 1;
  END IF;

  -- If no role found, return null
  IF user_role_level IS NULL THEN
    RETURN;
  END IF;

  -- Determine which users this role can view based on hierarchy within the same department
  CASE user_role_level
    WHEN 1 THEN -- Operational: only own data
      viewable_emails := ARRAY[target_email];
    WHEN 2 THEN -- Manager: own + operational level in same department
      SELECT ARRAY_AGG(ur.email) INTO viewable_emails
      FROM user_roles ur
      WHERE ur.role_level <= 2 
        AND ur.department_id = user_dept_id 
        AND ur.is_active = true;
    WHEN 3 THEN -- Deputy Director: own + manager + operational in same department
      SELECT ARRAY_AGG(ur.email) INTO viewable_emails
      FROM user_roles ur
      WHERE ur.role_level <= 3 
        AND ur.department_id = user_dept_id 
        AND ur.is_active = true;
    WHEN 4, 5 THEN -- Director/Admin: all data across all departments they have access to
      SELECT ARRAY_AGG(DISTINCT ur.email) INTO viewable_emails
      FROM user_roles ur
      WHERE ur.is_active = true
        AND (user_role_level = 5 OR ur.department_id = user_dept_id);
    ELSE
      viewable_emails := ARRAY[target_email];
  END CASE;

  -- Return the role information
  role_level := user_role_level;
  role_name := user_role_name;
  department_id := user_dept_id;
  department_code := user_dept_code;
  department_name := user_dept_name;
  is_active := user_is_active;
  can_view_emails := viewable_emails;
  
  RETURN NEXT;
END;
$$;

CREATE OR REPLACE FUNCTION is_email_authorized(user_email text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM user_roles 
    WHERE email = user_email AND is_active = true
  );
END;
$$;

-- Step 14: Insert sample departments if they don't exist
INSERT INTO departments (department_code, department_name, department_name_th) VALUES
  ('RA', 'Research and Academic Services', 'งานบริการวิจัยและวิชาการ'),
  ('TC', 'Technology Commercialization', 'งานถ่ายทอดเทคโนโลยีเชิงพาณิชย์'),
  ('EE', 'Entrepreneurial Ecosystem', 'งานระบบนิเวศผู้ประกอบการ'),
  ('SC', 'Strategy and Corporate Communications', 'งานยุทธศาสตร์และสื่อสารองค์กร'),
  ('AD', 'Administration', 'งานบริหาร')
ON CONFLICT (department_code) DO UPDATE SET
  department_name = EXCLUDED.department_name,
  department_name_th = EXCLUDED.department_name_th,
  updated_at = NOW();

-- Step 15: Add admin user if it doesn't exist
INSERT INTO user_roles (email, role_level, role_name, department_id) VALUES
  ('patipat.che@mahidol.ac.th', 5, 'ผู้ดูแลระบบ', 1)
ON CONFLICT (email, department_id) DO UPDATE SET
  role_level = EXCLUDED.role_level,
  role_name = EXCLUDED.role_name,
  updated_at = NOW();

-- Step 16: Grant necessary permissions
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT ALL ON departments TO authenticated;
GRANT ALL ON user_roles TO authenticated;
GRANT ALL ON asana_reports TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_role(text, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_departments(text) TO authenticated;
GRANT EXECUTE ON FUNCTION is_email_authorized(text) TO authenticated;

-- Step 17: Create safe trigger for user linking (AFTER all tables exist)
CREATE OR REPLACE FUNCTION safe_auto_link_user_role()
RETURNS TRIGGER AS $$
BEGIN
  -- Only update if user_roles table exists and user_id is missing
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'user_roles') THEN
    UPDATE user_roles 
    SET user_id = NEW.id, updated_at = NOW()
    WHERE email = NEW.email AND user_id IS NULL;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create the trigger on auth.users (safe version)
CREATE TRIGGER safe_auto_link_user_role_trigger
  AFTER INSERT OR UPDATE ON auth.users
  FOR EACH ROW EXECUTE FUNCTION safe_auto_link_user_role();

-- Step 18: Fix any existing users that don't have user_id linked
UPDATE user_roles 
SET user_id = au.id, updated_at = NOW()
FROM auth.users au 
WHERE user_roles.email = au.email 
  AND user_roles.user_id IS NULL 
  AND user_roles.is_active = true;

-- Step 19: Clean up old functions that might cause issues
DROP FUNCTION IF EXISTS update_user_role_user_id();

-- Step 20: Verification queries
SELECT 
  'ULTIMATE DATABASE FIX COMPLETED SUCCESSFULLY!' as status,
  COUNT(*) as total_departments,
  NOW() as completed_at
FROM departments 
WHERE is_active = true;

SELECT 
  'User roles and tables are ready!' as status,
  COUNT(*) as total_user_roles,
  COUNT(CASE WHEN user_id IS NOT NULL THEN 1 END) as linked_users
FROM user_roles 
WHERE is_active = true;

SELECT 
  'Database tables verified:' as verification,
  CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'departments') THEN 'EXISTS' ELSE 'MISSING' END as departments_table,
  CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'user_roles') THEN 'EXISTS' ELSE 'MISSING' END as user_roles_table,
  CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'asana_reports') THEN 'EXISTS' ELSE 'MISSING' END as asana_reports_table;