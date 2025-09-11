# Multi-Level User System with Department Support - Deployment Instructions

## Overview
This document provides step-by-step instructions to deploy the multi-level user system with department-based access control for the Asana Report NextJS application.

## Prerequisites
- Existing Supabase project with the main database setup completed
- Access to Supabase SQL editor
- Administrator credentials for your application

## 🚨 QUICK FIX FOR LOGIN ERRORS

### If you're experiencing login errors (especially "relation 'user_roles' does not exist"):

**IMMEDIATE SOLUTION**: Run `ULTIMATE_DATABASE_FIX.sql`

1. Log into your Supabase dashboard
2. Navigate to the SQL Editor
3. **Copy and run the entire `ULTIMATE_DATABASE_FIX.sql` file**
4. This single file fixes ALL database-related login issues

This ultimate fix handles:
- ✅ Missing tables error during login
- ✅ RLS policy infinite recursion
- ✅ Function type mismatches
- ✅ Auth trigger conflicts
- ✅ Cache access violations
- ✅ User role linking issues

## Database Setup

### Step 1: Run the Ultimate Database Fix (Recommended)
1. Log into your Supabase dashboard
2. Navigate to the SQL Editor
3. Run `ULTIMATE_DATABASE_FIX.sql` - this creates everything you need
4. **Skip to Step 4** if using the ultimate fix

### Step 1 (Alternative): Manual Setup
1. Log into your Supabase dashboard
2. Navigate to the SQL Editor
3. Run the main `database-setup.sql` first (if not already done)
4. Run `database-user-roles-setup.sql` to create the multi-level user system with department support

### Step 2: Configure Departments
Update the sample departments in the SQL script with your actual departments:

```sql
-- Replace these sample departments with your actual departments
INSERT INTO departments (department_code, department_name, department_name_th) VALUES
  ('IT', 'Information Technology', 'แผนกเทคโนโลยีสารสนเทศ'),
  ('HR', 'Human Resources', 'แผนกทรัพยากรบุคคล'),
  ('FIN', 'Finance', 'แผนกการเงิน'),
  ('MKT', 'Marketing', 'แผนกการตลาด')
ON CONFLICT (department_code) DO UPDATE SET
  department_name = EXCLUDED.department_name,
  department_name_th = EXCLUDED.department_name_th,
  updated_at = NOW();
```

### Step 3: Configure User Roles with Departments
Update the sample user roles with your actual user emails and department assignments:

```sql
-- Replace these with your actual user emails and department assignments
INSERT INTO user_roles (email, role_level, role_name, department_id) VALUES
  -- Admin has access to all departments (example with IT department)
  ('admin@company.com', 5, 'ผู้ดูแลระบบ', 1),
  
  -- IT Department
  ('it-director@company.com', 4, 'ผู้อำนวยการ', 1),
  ('it-deputy@company.com', 3, 'รองผู้อำนวยการ', 1),
  ('it-manager@company.com', 2, 'หัวหน้างาน', 1),
  ('it-staff@company.com', 1, 'ปฏิบัติการ', 1),
  
  -- HR Department
  ('hr-deputy@company.com', 3, 'รองผู้อำนวยการ', 2),
  ('hr-manager@company.com', 2, 'หัวหน้างาน', 2),
  ('hr-staff@company.com', 1, 'ปฏิบัติการ', 2),
  
  -- Example: User with access to multiple departments
  ('multi-dept-deputy@company.com', 3, 'รองผู้อำนวยการ', 1),
  ('multi-dept-deputy@company.com', 3, 'รองผู้อำนวยการ', 2)
ON CONFLICT (email, department_id) DO UPDATE SET
  role_level = EXCLUDED.role_level,
  role_name = EXCLUDED.role_name,
  updated_at = NOW();
```

## User Role Levels with Department Support

| Level | Role Name (Thai) | Role Name (English) | Department Permissions |
|-------|------------------|-------------------|----------------------|
| 1 | ปฏิบัติการ | Operational | View own data only within assigned department |
| 2 | หัวหน้างาน | Manager | View own + operational level data within assigned department |
| 3 | รองผู้อำนวยการ | Deputy Director | View own + manager + operational data within assigned department(s) |
| 4 | ผู้อำนวยการ | Director | View all data across all departments |
| 5 | ผู้ดูแลระบบ | Admin | View all data + system management across all departments |

## Department-Based Access Control

### Department Hierarchy Example
```
Department A (IT):
├── รองผู้อำนวยการ → sees หัวหน้างาน + ปฏิบัติการ in Department A only
├── หัวหน้างาน → sees ปฏิบัติการ in Department A only  
└── ปฏิบัติการ → sees only their own data

Department B (HR):
├── รองผู้อำนวยการ → sees หัวหน้างาน + ปฏิบัติการ in Department B only
├── หัวหน้างาน → sees ปฏิบัติการ in Department B only
└── ปฏิบัติการ → sees only their own data
```

### Multi-Department Access
- Users can be assigned to multiple departments with different roles
- When accessing the system, users with multiple departments will see a department selector dropdown
- The first user option is always themselves, with additional visible users based on their role within the selected department
- Directors and Admins can access all departments

## Environment Variables
Ensure your `.env.local` file includes:

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=your_supabase_anon_key
ASANA_TOKEN=your_asana_token
ASANA_PROJECT_ID=your_project_id
```

## Deployment Steps

### Step 1: Deploy Code Changes
1. Commit all code changes to your repository
2. Deploy to your hosting platform (Vercel, Netlify, etc.)
3. Ensure environment variables are properly configured

### Step 2: User Management (Backend Only)
To add new users to the system:

```sql
-- Add a new user role to a department
INSERT INTO user_roles (email, role_level, role_name, department_id, is_active)
VALUES ('new.user@company.com', 2, 'หัวหน้างาน', 1, true);

-- Add user to multiple departments
INSERT INTO user_roles (email, role_level, role_name, department_id, is_active) VALUES
  ('multi.dept@company.com', 3, 'รองผู้อำนวยการ', 1, true),
  ('multi.dept@company.com', 2, 'หัวหน้างาน', 2, true);

-- Update existing user role in a department
UPDATE user_roles 
SET role_level = 3, role_name = 'รองผู้อำนวยการ', updated_at = NOW()
WHERE email = 'existing.user@company.com' AND department_id = 1;

-- Deactivate user from all departments
UPDATE user_roles 
SET is_active = false, updated_at = NOW()
WHERE email = 'user.to.remove@company.com';

-- Deactivate user from specific department only
UPDATE user_roles 
SET is_active = false, updated_at = NOW()
WHERE email = 'user@company.com' AND department_id = 2;
```

### Step 3: Department Management

```sql
-- Add a new department
INSERT INTO departments (department_code, department_name, department_name_th, is_active)
VALUES ('ENG', 'Engineering', 'แผนกวิศวกรรม', true);

-- Update department information
UPDATE departments 
SET department_name_th = 'แผนกเทคโนโลยีสารสนเทศใหม่', updated_at = NOW()
WHERE department_code = 'IT';

-- Deactivate a department (also affects all user roles in that department)
UPDATE departments 
SET is_active = false, updated_at = NOW()
WHERE department_code = 'OLD_DEPT';
```
### Step 4: User Registration Process
1. Users must be added to the `user_roles` table with department assignments before they can register
2. Users use their assigned email to create an account via Supabase Auth
3. The system automatically links their Supabase user account to their role
4. Only pre-authorized emails can successfully register

## Testing the System

### Test User Access Levels with Department Support

1. **Operational Level User**
   - Should only see their own data
   - Cannot select other team members
   - Dashboard shows "Dashboard ส่วนบุคคล - [Department Name]"
   - No department selector (only has access to one department)

2. **Manager Level User**
   - Can see own data and operational level users within same department
   - Can select from available team members in their department
   - Dashboard shows "Dashboard ระดับหัวหน้างาน - [Department Name]"
   - May see department selector if assigned to multiple departments

3. **Deputy Director Level User**
   - Can see own + manager + operational level data within assigned departments
   - Can manage reports (create/update)
   - Dashboard shows "Dashboard ระดับรองผู้อำนวยการ - [Department Name]"
   - Department selector appears if assigned to multiple departments
   - User list updates when switching departments

4. **Director/Admin Level User**
   - Can see all data across all departments
   - Can manage and delete reports
   - Dashboard shows "Dashboard ระดับผู้อำนวยการ" or "Dashboard ผู้ดูแลระบบ"
   - May see department context but has access to all data

### Test Department Functionality

1. **Single Department User**
   - No department selector should appear
   - Dashboard title includes department name
   - User selection limited to department colleagues

2. **Multi-Department User**
   - Department selector dropdown should appear at top of dashboard
   - Can switch between assigned departments
   - User list and permissions update based on selected department
   - User always appears first in user selection regardless of department

3. **Department-Based Data Filtering**
   - Manager in Dept A should not see users from Dept B
   - Deputy Director with access to multiple departments should see different user lists when switching departments
   - Directors should see all users regardless of department selection

### Test Authentication Flow

1. **Valid Email Registration**
   ```
   Email: authorized@company.com (exists in user_roles)
   Result: Registration succeeds, user is linked to role
   ```

2. **Invalid Email Registration**
   ```
   Email: unauthorized@company.com (not in user_roles)
   Result: Login fails with "อีเมลนี้ไม่ได้รับอนุญาตให้เข้าใช้ระบบ"
   ```

3. **Deactivated User**
   ```
   Email: deactivated@company.com (is_active = false)
   Result: Login fails or redirected to login
   ```

### Test Data Filtering

1. **API Endpoints**
   - Verify Asana data is filtered based on user role
   - Check that unauthorized users cannot access restricted data

2. **UI Components**
   - User selector only shows permitted team members
   - Header displays correct role information
   - Dashboard title reflects user level

## Troubleshooting

### Critical Fix for Database Issues

#### **🚨 ULTIMATE DATABASE FIX** (Use This for All Login Issues)

If you're experiencing ANY of the following issues:
- ❌ `error update user's last_sign_in field: ERROR: relation "user_roles" does not exist (SQLSTATE 42P01)`
- ❌ `relation "user_roles" does not exist`
- ❌ `infinite recursion detected in policy for relation "user_roles"`
- ❌ `new row violates row-level security policy for table 'asana_reports'`
- ❌ `Returned type character varying(20) does not match expected type text`
- ❌ Login failures with database errors
- ❌ Any trigger-related errors during login

**IMMEDIATE SOLUTION:** Run the ULTIMATE database fix file:

```bash
# Run this SINGLE file in Supabase SQL editor to fix ALL database issues
ULTIMATE_DATABASE_FIX.sql
```

**This NEW ultimate fix specifically addresses:**
- ✅ **Removes problematic triggers** that cause login failures
- ✅ **Creates missing tables** (departments, user_roles, asana_reports)
- ✅ **Fixes trigger conflicts** that prevent authentication
- ✅ **Safe RLS policies** that don't block login
- ✅ **Proper user_id linking** without breaking authentication
- ✅ **Complete database reset** to working state

**Key Difference from Previous Fixes:**
- Removes all problematic auth triggers before creating tables
- Uses safe trigger implementation that checks table existence
- Ensures login process never fails due to missing tables
- Comprehensive permissions and clean policy setup

**After running this file, login should work immediately without any database errors.**

### Individual Hotfix Files (Alternative)

#### 1. RLS Policy Error for asana_reports Table

**Error:** `new row violates row-level security policy for table 'asana_reports'`

**Cause:** The RLS policies for the asana_reports table are too restrictive or user_id linking is missing.

**Solution:** Run the hotfix SQL file:

```bash
# Run this hotfix in Supabase SQL editor
HOTFIX_ASANA_REPORTS_RLS.sql
```

This hotfix:
- Updates RLS policies to allow all users with valid roles to access cache data
- Fixes user_id linking between auth.users and user_roles tables
- Adds automatic user_id updates on login

#### 2. Login Errors (Previous Issues - Fixed)

**Error:** `infinite recursion detected in policy for relation "user_roles"`

**Solution:** Already fixed in `HOTFIX_LOGIN_ERRORS.sql`

#### 3. Function Type Mismatches (Previous Issues - Fixed)

**Error:** `Returned type character varying(20) does not match expected type text`

**Solution:** Already fixed in `HOTFIX_LOGIN_ERRORS.sql`

#### 4. Missing Table Error During Login

**Error:** 
```
error update user's last_sign_in field: ERROR: relation "user_roles" does not exist (SQLSTATE 42P01)
```

**Cause:** 
- The user_roles table doesn't exist in the database
- Auth triggers are trying to access non-existent tables during login
- Database setup is incomplete

**Solution:** Use the `ULTIMATE_DATABASE_FIX.sql` file:
1. This removes all problematic triggers first
2. Creates all required tables 
3. Sets up safe triggers that won't break login
4. Ensures the login process works regardless of table state

**Why previous fixes might not work:**
- Old triggers remain active and try to access missing tables
- Trigger creation order causes dependencies on non-existent tables
- RLS policies reference tables that don't exist yet

The ULTIMATE fix addresses all these issues by starting with a completely clean slate.

#### 5. User Cannot Access System After Login

**Symptoms:**
- User can log in but gets "อีเมลนี้ไม่ได้รับอนุญาตให้เข้าใช้ระบบ"
- User dashboard shows no data

**Solution:**
1. Check if user exists in user_roles table:
```sql
SELECT * FROM user_roles WHERE email = 'user@company.com';
```

2. Check if user_id is properly linked:
```sql
SELECT ur.*, au.id as auth_user_id 
FROM user_roles ur 
LEFT JOIN auth.users au ON ur.email = au.email 
WHERE ur.email = 'user@company.com';
```

3. If user_id is NULL, update it manually:
```sql
UPDATE user_roles 
SET user_id = (SELECT id FROM auth.users WHERE email = 'user@company.com')
WHERE email = 'user@company.com' AND user_id IS NULL;
```

#### 6. Department Switching Not Working

**Symptoms:**
- User has multiple departments but cannot switch
- Department selector not showing

**Solution:**
1. Verify user has multiple active departments:
```sql
SELECT * FROM get_user_departments('user@company.com');
```

2. Check if departments are active:
```sql
SELECT d.*, ur.* 
FROM user_roles ur 
JOIN departments d ON ur.department_id = d.id 
WHERE ur.email = 'user@company.com' AND ur.is_active = true;
```

## Monitoring and Maintenance

### Database Views for User Management
Use the `user_roles_management` view to see all users and their statuses:

```sql
SELECT * FROM user_roles_management ORDER BY role_level DESC;
```

### Common Maintenance Tasks

1. **Add New User**
   ```sql
   INSERT INTO user_roles (email, role_level, role_name, department_id) 
   VALUES ('newuser@company.com', 2, 'หัวหน้างาน', 1);
   ```

2. **Promote User**
   ```sql
   UPDATE user_roles 
   SET role_level = 3, role_name = 'รองผู้อำนวยการ' 
   WHERE email = 'user@company.com' AND department_id = 1;
   ```

3. **Check User Permissions**
   ```sql
   SELECT * FROM get_user_role('user@company.com');
   ```

### Log Analysis
Monitor application logs for:
- Authentication errors
- Role permission failures
- Database query errors
- Unauthorized access attempts

## Security Considerations

1. **Row Level Security**: All tables have RLS enabled
2. **Function Security**: Database functions use SECURITY DEFINER
3. **Role Validation**: Middleware validates roles on every request
4. **Email Authorization**: Only pre-authorized emails can register
5. **Session Management**: Supabase handles secure session management

## Next Steps

After successful deployment:

1. Train users on the new role-based system
2. Monitor system performance and user feedback
3. Plan for additional features like role-based reporting
4. Consider implementing audit logs for user actions
5. Regular security reviews and updates

## Support

For issues or questions:
1. Check application logs
2. Review Supabase dashboard for errors
3. Verify database functions and policies
4. Test with different user roles to isolate issues