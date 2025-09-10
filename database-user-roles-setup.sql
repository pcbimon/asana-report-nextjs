/**
 * Multi-Level User System Database Setup for Supabase
 * Run these commands in your Supabase SQL editor AFTER the main database-setup.sql
 */

-- Create user_roles table for multi-level access control
CREATE TABLE IF NOT EXISTS user_roles (
  id SERIAL PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  role_level INTEGER NOT NULL CHECK (role_level >= 1 AND role_level <= 5),
  role_name VARCHAR(50) NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_user_roles_email ON user_roles(email);
CREATE INDEX IF NOT EXISTS idx_user_roles_user_id ON user_roles(user_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_role_level ON user_roles(role_level);
CREATE INDEX IF NOT EXISTS idx_user_roles_active ON user_roles(is_active);

-- Create update trigger for updated_at
CREATE TRIGGER update_user_roles_updated_at 
  BEFORE UPDATE ON user_roles 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Enable Row Level Security (RLS)
ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY;

-- Create policies for user_roles table
-- Users can view their own role information
CREATE POLICY "Users can view own role" ON user_roles
  FOR SELECT USING (auth.uid() = user_id);

-- Only admins (role_level 5) can manage user roles
CREATE POLICY "Admins can manage all roles" ON user_roles
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM user_roles ur 
      WHERE ur.user_id = auth.uid() 
      AND ur.role_level = 5 
      AND ur.is_active = true
    )
  );

-- Function to get user role information
CREATE OR REPLACE FUNCTION get_user_role(user_email text DEFAULT NULL)
RETURNS TABLE (
  role_level integer,
  role_name text,
  is_active boolean,
  can_view_emails text[]
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  target_email text;
  user_role_level integer;
  user_role_name text;
  user_is_active boolean;
  viewable_emails text[];
BEGIN
  -- Use provided email or get current user's email
  IF user_email IS NULL THEN
    SELECT email INTO target_email FROM auth.users WHERE id = auth.uid();
  ELSE
    target_email := user_email;
  END IF;

  -- Get user role information
  SELECT ur.role_level, ur.role_name, ur.is_active 
  INTO user_role_level, user_role_name, user_is_active
  FROM user_roles ur 
  WHERE ur.email = target_email AND ur.is_active = true;

  -- If no role found, return null
  IF user_role_level IS NULL THEN
    RETURN;
  END IF;

  -- Determine which users this role can view based on hierarchy
  CASE user_role_level
    WHEN 1 THEN -- Operational: only own data
      viewable_emails := ARRAY[target_email];
    WHEN 2 THEN -- Manager: own + operational level
      SELECT ARRAY_AGG(email) INTO viewable_emails
      FROM user_roles 
      WHERE role_level <= 2 AND is_active = true;
    WHEN 3 THEN -- Deputy Director: own + manager + operational
      SELECT ARRAY_AGG(email) INTO viewable_emails
      FROM user_roles 
      WHERE role_level <= 3 AND is_active = true;
    WHEN 4, 5 THEN -- Director/Admin: all data
      SELECT ARRAY_AGG(email) INTO viewable_emails
      FROM user_roles 
      WHERE is_active = true;
    ELSE
      viewable_emails := ARRAY[target_email];
  END CASE;

  -- Return the role information
  role_level := user_role_level;
  role_name := user_role_name;
  is_active := user_is_active;
  can_view_emails := viewable_emails;
  
  RETURN NEXT;
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

-- Insert sample user roles (REPLACE WITH YOUR ACTUAL USER EMAILS)
-- These are examples - update with your actual user emails before running
INSERT INTO user_roles (email, role_level, role_name) VALUES
  ('admin@example.com', 5, 'Admin'),
  ('director@example.com', 4, 'Director'),
  ('deputy@example.com', 3, 'Deputy Director'),
  ('manager@example.com', 2, 'Manager'),
  ('staff@example.com', 1, 'Operational')
ON CONFLICT (email) DO UPDATE SET
  role_level = EXCLUDED.role_level,
  role_name = EXCLUDED.role_name,
  updated_at = NOW();

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT SELECT ON user_roles TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_role(text) TO authenticated;
GRANT EXECUTE ON FUNCTION is_email_authorized(text) TO authenticated;

-- Create view for easier role management (admin only)
CREATE OR REPLACE VIEW user_roles_management AS
SELECT 
  ur.id,
  ur.email,
  ur.role_level,
  ur.role_name,
  ur.user_id,
  au.email as auth_email,
  ur.is_active,
  ur.created_at,
  ur.updated_at
FROM user_roles ur
LEFT JOIN auth.users au ON ur.user_id = au.id
WHERE ur.is_active = true
ORDER BY ur.role_level DESC, ur.email;

-- Grant view access to admins only
GRANT SELECT ON user_roles_management TO authenticated;

COMMENT ON TABLE user_roles IS 'Multi-level user roles for hierarchical data access control';
COMMENT ON COLUMN user_roles.role_level IS '1=Operational, 2=Manager, 3=Deputy Director, 4=Director, 5=Admin';
COMMENT ON FUNCTION get_user_role(text) IS 'Returns user role information and list of emails they can view';
COMMENT ON FUNCTION is_email_authorized(text) IS 'Checks if email is authorized for registration';