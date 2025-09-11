/**
 * FINAL LOGIN FIX - Complete Solution for "relation 'user_roles' does not exist"
 * 
 * This SQL file completely removes ALL problematic auth triggers and functions
 * that interfere with the login process, then recreates the entire database 
 * structure from scratch in a clean, safe manner.
 * 
 * PROBLEM: Auth triggers try to access user_roles table during login before
 * the table exists or without proper permissions, causing login to fail.
 * 
 * SOLUTION: Remove all auth-related triggers, create tables safely, then
 * add back only safe triggers that won't break authentication.
 */

-- ==========================================
-- STEP 1: REMOVE ALL PROBLEMATIC TRIGGERS
-- ==========================================

-- Remove all triggers that might interfere with auth.users during login
DROP TRIGGER IF EXISTS update_user_roles_on_login ON auth.users;
DROP TRIGGER IF EXISTS auto_link_user_role_trigger ON auth.users;
DROP TRIGGER IF EXISTS safe_auto_link_user_role_trigger ON auth.users;
DROP TRIGGER IF EXISTS update_user_role_on_signin ON auth.users;
DROP TRIGGER IF EXISTS link_user_role_on_login ON auth.users;

-- Remove all functions that might cause issues
DROP FUNCTION IF EXISTS update_user_role_user_id();
DROP FUNCTION IF EXISTS auto_link_user_role();
DROP FUNCTION IF EXISTS safe_auto_link_user_role();

-- ==========================================
-- STEP 2: CREATE BASIC UTILITY FUNCTIONS
-- ==========================================

-- Create basic utility function for updating timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ==========================================
-- STEP 3: CREATE ALL TABLES FROM SCRATCH
-- ==========================================

-- Create departments table
DROP TABLE IF EXISTS departments CASCADE;
CREATE TABLE departments (
  id SERIAL PRIMARY KEY,
  department_code VARCHAR(20) UNIQUE NOT NULL,
  department_name VARCHAR(100) NOT NULL,
  department_name_th VARCHAR(100) NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create user_roles table  
DROP TABLE IF EXISTS user_roles CASCADE;
CREATE TABLE user_roles (
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

-- Create asana_reports table
DROP TABLE IF EXISTS asana_reports CASCADE;
CREATE TABLE asana_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cache_key VARCHAR(255) UNIQUE NOT NULL,
  report_data JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '1 hour')
);

-- ==========================================
-- STEP 4: CREATE INDEXES
-- ==========================================

CREATE INDEX idx_departments_code ON departments(department_code);
CREATE INDEX idx_departments_active ON departments(is_active);
CREATE INDEX idx_user_roles_email ON user_roles(email);
CREATE INDEX idx_user_roles_user_id ON user_roles(user_id);
CREATE INDEX idx_user_roles_role_level ON user_roles(role_level);
CREATE INDEX idx_user_roles_active ON user_roles(is_active);
CREATE INDEX idx_user_roles_department ON user_roles(department_id);
CREATE INDEX idx_user_roles_email_dept ON user_roles(email, department_id);
CREATE INDEX idx_asana_reports_cache_key ON asana_reports(cache_key);
CREATE INDEX idx_asana_reports_expires_at ON asana_reports(expires_at);

-- ==========================================
-- STEP 5: CREATE SAFE UPDATE TRIGGERS
-- ==========================================

-- Only create triggers for updating timestamps - NO AUTH-RELATED TRIGGERS
CREATE TRIGGER update_departments_updated_at 
  BEFORE UPDATE ON departments 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_roles_updated_at 
  BEFORE UPDATE ON user_roles 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_asana_reports_updated_at 
  BEFORE UPDATE ON asana_reports 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ==========================================
-- STEP 6: ENABLE RLS AND CREATE SAFE POLICIES
-- ==========================================

-- Enable RLS
ALTER TABLE departments ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE asana_reports ENABLE ROW LEVEL SECURITY;

-- Drop all existing policies to ensure clean state
DO $$
DECLARE
    pol RECORD;
BEGIN
    -- Drop all policies on departments
    FOR pol IN SELECT policyname FROM pg_policies WHERE tablename = 'departments' LOOP
        EXECUTE 'DROP POLICY IF EXISTS ' || quote_ident(pol.policyname) || ' ON departments';
    END LOOP;
    
    -- Drop all policies on user_roles
    FOR pol IN SELECT policyname FROM pg_policies WHERE tablename = 'user_roles' LOOP
        EXECUTE 'DROP POLICY IF EXISTS ' || quote_ident(pol.policyname) || ' ON user_roles';
    END LOOP;
    
    -- Drop all policies on asana_reports
    FOR pol IN SELECT policyname FROM pg_policies WHERE tablename = 'asana_reports' LOOP
        EXECUTE 'DROP POLICY IF EXISTS ' || quote_ident(pol.policyname) || ' ON asana_reports';
    END LOOP;
END $$;

-- Create simple, safe policies that don't interfere with auth
CREATE POLICY "authenticated_users_full_access_departments" ON departments
  FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "authenticated_users_full_access_user_roles" ON user_roles
  FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "authenticated_users_full_access_asana_reports" ON asana_reports
  FOR ALL USING (auth.role() = 'authenticated');

-- ==========================================
-- STEP 7: CREATE SAFE DATABASE FUNCTIONS
-- ==========================================

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
  IF user_email IS NULL THEN
    SELECT email INTO target_email FROM auth.users WHERE id = auth.uid();
  ELSE
    target_email := user_email;
  END IF;

  IF target_email IS NULL THEN
    RETURN;
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
  IF user_email IS NULL THEN
    SELECT email INTO target_email FROM auth.users WHERE id = auth.uid();
  ELSE
    target_email := user_email;
  END IF;

  IF target_email IS NULL THEN
    RETURN;
  END IF;

  -- Get user role information
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

  IF user_role_level IS NULL THEN
    RETURN;
  END IF;

  -- Determine viewable emails based on role hierarchy
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
    WHEN 4, 5 THEN -- Director/Admin: broader access
      SELECT ARRAY_AGG(DISTINCT ur.email) INTO viewable_emails
      FROM user_roles ur
      WHERE ur.is_active = true
        AND (user_role_level = 5 OR ur.department_id = user_dept_id);
    ELSE
      viewable_emails := ARRAY[target_email];
  END CASE;

  -- Return results
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

-- ==========================================
-- STEP 8: INSERT SAMPLE DATA
-- ==========================================

-- Insert sample departments
INSERT INTO departments (department_code, department_name, department_name_th) VALUES
  ('RA', 'Research and Academic Services', 'งานบริการวิจัยและวิชาการ'),
  ('TC', 'Technology Commercialization', 'งานถ่ายทอดเทคโนโลยีเชิงพาณิชย์'),
  ('EE', 'Entrepreneurial Ecosystem', 'งานระบบนิเวศผู้ประกอบการ'),
  ('SC', 'Strategy and Corporate Communications', 'งานยุทธศาสตร์และสื่อสารองค์กร'),
  ('AD', 'Administration', 'งานบริหาร');

-- Insert admin user (using the email from the error log)
INSERT INTO user_roles (email, role_level, role_name, department_id) VALUES
  ('patipat.che@mahidol.ac.th', 5, 'ผู้ดูแลระบบ', 1);

-- ==========================================
-- STEP 9: GRANT PERMISSIONS
-- ==========================================

GRANT USAGE ON SCHEMA public TO authenticated;
GRANT ALL ON departments TO authenticated;
GRANT ALL ON user_roles TO authenticated;
GRANT ALL ON asana_reports TO authenticated;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_role(text, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_departments(text) TO authenticated;
GRANT EXECUTE ON FUNCTION is_email_authorized(text) TO authenticated;

-- ==========================================
-- STEP 10: MANUAL USER LINKING (SAFE)
-- ==========================================

-- Manually link existing users without using triggers
UPDATE user_roles 
SET user_id = (
  SELECT au.id 
  FROM auth.users au 
  WHERE au.email = user_roles.email
), updated_at = NOW()
WHERE user_id IS NULL 
  AND EXISTS (
    SELECT 1 FROM auth.users au 
    WHERE au.email = user_roles.email
  );

-- ==========================================
-- STEP 11: VERIFICATION AND CLEANUP
-- ==========================================

-- Verify all tables exist
SELECT 
  'FINAL LOGIN FIX COMPLETED!' as status,
  CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'departments') THEN 'EXISTS' ELSE 'MISSING' END as departments_table,
  CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'user_roles') THEN 'EXISTS' ELSE 'MISSING' END as user_roles_table,
  CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'asana_reports') THEN 'EXISTS' ELSE 'MISSING' END as asana_reports_table,
  (SELECT COUNT(*) FROM departments) as total_departments,
  (SELECT COUNT(*) FROM user_roles) as total_user_roles,
  NOW() as completed_at;

-- Show all existing triggers on auth.users to confirm they're removed
SELECT 
  'TRIGGERS VERIFICATION' as check_type,
  trigger_name,
  event_manipulation,
  trigger_schema,
  trigger_catalog
FROM information_schema.triggers 
WHERE event_object_table = 'users' 
  AND trigger_schema = 'auth'
ORDER BY trigger_name;

-- Final message
SELECT 'LOGIN SHOULD NOW WORK WITHOUT ERRORS!' as final_status;