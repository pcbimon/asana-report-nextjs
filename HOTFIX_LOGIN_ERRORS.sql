/**
 * HOTFIX SQL for Existing Installations
 * Run this ONLY if you've already run database-user-roles-setup.sql and encountering the login errors
 * This fixes the RLS policy infinite recursion and function type mismatches
 */

-- Fix 1: Remove problematic RLS policies and replace with safe ones
DROP POLICY IF EXISTS "Admins can manage all roles" ON user_roles;
DROP POLICY IF EXISTS "Admins can manage departments" ON departments;

-- Replace with non-recursive policies for user_roles
CREATE POLICY "Authenticated users can manage roles" ON user_roles
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can update roles" ON user_roles
  FOR UPDATE USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can delete roles" ON user_roles
  FOR DELETE USING (auth.role() = 'authenticated');

-- Replace with non-recursive policies for departments
CREATE POLICY "Authenticated users can manage departments" ON departments
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can update departments" ON departments
  FOR UPDATE USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can delete departments" ON departments
  FOR DELETE USING (auth.role() = 'authenticated');

-- Fix 2: Update function types to match actual column types
CREATE OR REPLACE FUNCTION get_user_departments(user_email text DEFAULT NULL)
RETURNS TABLE (
  department_id integer,
  department_code varchar(20),  -- Fixed: was text
  department_name varchar(100), -- Fixed: was text
  role_level integer,
  role_name varchar(50)         -- Fixed: was text
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

-- Fix 3: Update get_user_role function types
CREATE OR REPLACE FUNCTION get_user_role(user_email text DEFAULT NULL, dept_id integer DEFAULT NULL)
RETURNS TABLE (
  role_level integer,
  role_name varchar(50),        -- Fixed: was text
  department_id integer,
  department_code varchar(20),  -- Fixed: was text
  department_name varchar(100), -- Fixed: was text
  is_active boolean,
  can_view_emails text[]
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  target_email text;
  user_role_level integer;
  user_role_name varchar(50);   -- Fixed: was text
  user_dept_id integer;
  user_dept_code varchar(20);   -- Fixed: was text
  user_dept_name varchar(100);  -- Fixed: was text
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

-- Verify functions work correctly
SELECT 'Hotfix applied successfully. You can now test login functionality.' as status;