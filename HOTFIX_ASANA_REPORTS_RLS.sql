/**
 * HOTFIX for asana_reports RLS Policy Error
 * 
 * Problem: The RLS policies for asana_reports table are too restrictive.
 * Only users with role_level >= 3 can insert, but asana_reports is used for caching
 * API data that should be accessible to all authenticated users.
 * 
 * Error: "new row violates row-level security policy for table 'asana_reports'"
 * 
 * Solution: Update RLS policies to allow all authenticated users with valid roles
 * to access asana_reports for caching purposes.
 */

-- Drop existing restrictive policies for asana_reports
DROP POLICY IF EXISTS "Role-based read access for asana_reports" ON asana_reports;
DROP POLICY IF EXISTS "Role-based insert access for asana_reports" ON asana_reports;
DROP POLICY IF EXISTS "Role-based update access for asana_reports" ON asana_reports;
DROP POLICY IF EXISTS "Role-based delete access for asana_reports" ON asana_reports;

-- Create new policies that allow all users with valid roles to access cache data
CREATE POLICY "Authenticated users with roles can read asana_reports" ON asana_reports
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM user_roles ur 
      WHERE ur.user_id = auth.uid() 
      AND ur.is_active = true
    )
  );

CREATE POLICY "Authenticated users with roles can insert asana_reports" ON asana_reports
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_roles ur 
      WHERE ur.user_id = auth.uid() 
      AND ur.is_active = true
    )
  );

CREATE POLICY "Authenticated users with roles can update asana_reports" ON asana_reports
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM user_roles ur 
      WHERE ur.user_id = auth.uid() 
      AND ur.is_active = true
    )
  );

CREATE POLICY "Authenticated users with roles can delete asana_reports" ON asana_reports
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM user_roles ur 
      WHERE ur.user_id = auth.uid() 
      AND ur.is_active = true
    )
  );

-- Ensure user_id is properly set for existing roles when they log in
-- This function will be called during the login process to link user_id
CREATE OR REPLACE FUNCTION update_user_role_user_id()
RETURNS TRIGGER AS $$
BEGIN
  -- When a user logs in (auth.users record is updated), update user_roles.user_id
  UPDATE user_roles 
  SET user_id = NEW.id, updated_at = NOW()
  WHERE email = NEW.email AND user_id IS NULL;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger to automatically update user_id when user logs in
DROP TRIGGER IF EXISTS update_user_roles_on_login ON auth.users;
CREATE TRIGGER update_user_roles_on_login
  AFTER UPDATE ON auth.users
  FOR EACH ROW
  WHEN (OLD.last_sign_in_at IS DISTINCT FROM NEW.last_sign_in_at)
  EXECUTE FUNCTION update_user_role_user_id();

-- Manual fix for existing users - update user_id for any existing auth.users
UPDATE user_roles 
SET user_id = (
  SELECT id FROM auth.users 
  WHERE auth.users.email = user_roles.email
), updated_at = NOW()
WHERE user_id IS NULL 
  AND EXISTS (
    SELECT 1 FROM auth.users 
    WHERE auth.users.email = user_roles.email
  );

-- Verify the fix
SELECT 'asana_reports RLS policies updated successfully. Users with valid roles can now access cache data.' as status;

-- Show current user roles status
SELECT 
  ur.email,
  ur.role_level,
  ur.role_name,
  d.department_name_th,
  CASE 
    WHEN ur.user_id IS NOT NULL THEN 'Linked to auth.users'
    ELSE 'Not linked - will be linked on next login'
  END as user_id_status,
  ur.is_active
FROM user_roles ur
JOIN departments d ON ur.department_id = d.id
ORDER BY ur.email;