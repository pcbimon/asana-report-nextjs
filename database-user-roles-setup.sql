/**
 * Multi-Level User System Database Setup for Supabase
 * Run these commands in your Supabase SQL editor AFTER the main database-setup.sql
 */

-- Create departments table
CREATE TABLE IF NOT EXISTS departments (
  id SERIAL PRIMARY KEY,
  department_code VARCHAR(20) UNIQUE NOT NULL,
  department_name VARCHAR(100) NOT NULL,
  department_name_th VARCHAR(100) NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create user_roles table for multi-level access control (updated for department support)
CREATE TABLE IF NOT EXISTS user_roles (
  id SERIAL PRIMARY KEY,
  email VARCHAR(255) NOT NULL, -- Removed UNIQUE constraint to allow multiple department assignments
  role_level INTEGER NOT NULL CHECK (role_level >= 1 AND role_level <= 5),
  role_name VARCHAR(50) NOT NULL,
  department_id INTEGER REFERENCES departments(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  UNIQUE(email, department_id) -- Ensure one role per department per user
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_departments_code ON departments(department_code);
CREATE INDEX IF NOT EXISTS idx_departments_active ON departments(is_active);

CREATE INDEX IF NOT EXISTS idx_user_roles_email ON user_roles(email);
CREATE INDEX IF NOT EXISTS idx_user_roles_user_id ON user_roles(user_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_role_level ON user_roles(role_level);
CREATE INDEX IF NOT EXISTS idx_user_roles_active ON user_roles(is_active);
CREATE INDEX IF NOT EXISTS idx_user_roles_department ON user_roles(department_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_email_dept ON user_roles(email, department_id);

-- Create update trigger for updated_at
CREATE TRIGGER update_departments_updated_at 
  BEFORE UPDATE ON departments 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_roles_updated_at 
  BEFORE UPDATE ON user_roles 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Enable Row Level Security (RLS)
ALTER TABLE departments ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY;

-- Create policies for departments table
-- All authenticated users can view active departments
CREATE POLICY "Users can view active departments" ON departments
  FOR SELECT USING (is_active = true);

-- Allow insert/update/delete for authenticated users (admin permissions will be handled at application level)
CREATE POLICY "Authenticated users can manage departments" ON departments
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can update departments" ON departments
  FOR UPDATE USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can delete departments" ON departments
  FOR DELETE USING (auth.role() = 'authenticated');

-- Create policies for user_roles table
-- Users can view their own role information
CREATE POLICY "Users can view own role" ON user_roles
  FOR SELECT USING (auth.uid() = user_id);

-- Allow insert/update/delete for authenticated users (specific permissions will be handled at application level)
CREATE POLICY "Authenticated users can manage roles" ON user_roles
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can update roles" ON user_roles
  FOR UPDATE USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can delete roles" ON user_roles
  FOR DELETE USING (auth.role() = 'authenticated');

-- Function to get user role information with department support
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

-- Function to get user departments
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

-- Function to check if user email is authorized for registration
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

-- Update asana_reports policies to respect role-based access
DROP POLICY IF EXISTS "Enable read access for authenticated users" ON asana_reports;
DROP POLICY IF EXISTS "Enable insert access for authenticated users" ON asana_reports;
DROP POLICY IF EXISTS "Enable update access for authenticated users" ON asana_reports;
DROP POLICY IF EXISTS "Enable delete access for authenticated users" ON asana_reports;

-- New role-based policies for asana_reports
CREATE POLICY "Role-based read access for asana_reports" ON asana_reports
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM user_roles ur 
      WHERE ur.user_id = auth.uid() 
      AND ur.is_active = true
    )
  );

CREATE POLICY "Role-based insert access for asana_reports" ON asana_reports
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_roles ur 
      WHERE ur.user_id = auth.uid() 
      AND ur.role_level >= 3 -- Deputy Director and above can insert
      AND ur.is_active = true
    )
  );

CREATE POLICY "Role-based update access for asana_reports" ON asana_reports
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM user_roles ur 
      WHERE ur.user_id = auth.uid() 
      AND ur.role_level >= 3 -- Deputy Director and above can update
      AND ur.is_active = true
    )
  );

CREATE POLICY "Role-based delete access for asana_reports" ON asana_reports
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM user_roles ur 
      WHERE ur.user_id = auth.uid() 
      AND ur.role_level >= 4 -- Director and above can delete
      AND ur.is_active = true
    )
  );

-- Insert sample departments
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

-- Insert sample user roles with department associations (REPLACE WITH YOUR ACTUAL DATA)
-- These are examples - update with your actual user emails and department assignments before running
INSERT INTO user_roles (email, role_level, role_name, department_id) VALUES
  ('patipat.che@mahidol.ac.th', 5, 'ผู้ดูแลระบบ', 1)
ON CONFLICT (email, department_id) DO UPDATE SET
  role_level = EXCLUDED.role_level,
  role_name = EXCLUDED.role_name,
  updated_at = NOW();

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT SELECT ON departments TO authenticated;
GRANT SELECT ON user_roles TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_role(text, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_departments(text) TO authenticated;
GRANT EXECUTE ON FUNCTION is_email_authorized(text) TO authenticated;

-- Create view for easier role management (admin only)
CREATE OR REPLACE VIEW user_roles_management AS
SELECT 
  ur.id,
  ur.email,
  ur.role_level,
  ur.role_name,
  ur.department_id,
  d.department_code,
  d.department_name_th as department_name,
  ur.user_id,
  au.email as auth_email,
  ur.is_active,
  ur.created_at,
  ur.updated_at
FROM user_roles ur
JOIN departments d ON ur.department_id = d.id
LEFT JOIN auth.users au ON ur.user_id = au.id
WHERE ur.is_active = true AND d.is_active = true
ORDER BY d.department_code, ur.role_level DESC, ur.email;

-- Grant view access to admins only
GRANT SELECT ON user_roles_management TO authenticated;

COMMENT ON TABLE departments IS 'Departments/divisions for organizational structure';
COMMENT ON TABLE user_roles IS 'Multi-level user roles with department-based access control';
COMMENT ON COLUMN user_roles.role_level IS '1=Operational, 2=Manager, 3=Deputy Director, 4=Director, 5=Admin';
COMMENT ON FUNCTION get_user_role(text, integer) IS 'Returns user role information and list of emails they can view within department';
COMMENT ON FUNCTION get_user_departments(text) IS 'Returns all departments a user has access to';
COMMENT ON FUNCTION is_email_authorized(text) IS 'Checks if email is authorized for registration';