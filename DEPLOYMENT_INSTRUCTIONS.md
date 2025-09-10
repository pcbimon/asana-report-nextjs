# Multi-Level User System Deployment Instructions

## Overview
This document provides step-by-step instructions to deploy the multi-level user system for the Asana Report NextJS application.

## Prerequisites
- Existing Supabase project with the main database setup completed
- Access to Supabase SQL editor
- Administrator credentials for your application

## Database Setup

### Step 1: Run the User Roles Database Setup
1. Log into your Supabase dashboard
2. Navigate to the SQL Editor
3. Run the main `database-setup.sql` first (if not already done)
4. Run `database-user-roles-setup.sql` to create the multi-level user system

### Step 2: Configure User Roles
Update the sample user roles in the SQL script with your actual user emails:

```sql
-- Replace these sample emails with your actual user emails
INSERT INTO user_roles (email, role_level, role_name) VALUES
  ('your-admin@company.com', 5, 'Admin'),
  ('director@company.com', 4, 'Director'),
  ('deputy@company.com', 3, 'Deputy Director'),
  ('manager@company.com', 2, 'Manager'),
  ('staff@company.com', 1, 'Operational')
ON CONFLICT (email) DO UPDATE SET
  role_level = EXCLUDED.role_level,
  role_name = EXCLUDED.role_name,
  updated_at = NOW();
```

## User Role Levels

| Level | Role Name (Thai) | Role Name (English) | Permissions |
|-------|------------------|-------------------|-------------|
| 1 | ปฏิบัติการ | Operational | View own data only |
| 2 | หัวหน้างาน | Manager | View own + operational level data |
| 3 | รองผู้อำนวยการ | Deputy Director | View own + manager + operational data |
| 4 | ผู้อำนวยการ | Director | View all data |
| 5 | ผู้ดูแลระบบ | Admin | View all data + system management |

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
-- Add a new user role
INSERT INTO user_roles (email, role_level, role_name, is_active)
VALUES ('new.user@company.com', 2, 'Manager', true);

-- Update existing user role
UPDATE user_roles 
SET role_level = 3, role_name = 'Deputy Director', updated_at = NOW()
WHERE email = 'user@company.com';

-- Deactivate a user
UPDATE user_roles 
SET is_active = false, updated_at = NOW()
WHERE email = 'user@company.com';
```

### Step 3: User Registration Process
1. Users must be added to the `user_roles` table before they can register
2. Users use their assigned email to create an account via Supabase Auth
3. The system automatically links their Supabase user account to their role
4. Only pre-authorized emails can successfully register

## Testing the System

### Test User Access Levels

1. **Operational Level User**
   - Should only see their own data
   - Cannot select other team members
   - Dashboard shows "Dashboard ส่วนบุคคล"

2. **Manager Level User**
   - Can see own data and operational level users
   - Can select from available team members
   - Dashboard shows "Dashboard ระดับหัวหน้างาน"

3. **Deputy Director Level User**
   - Can see own + manager + operational level data
   - Can manage reports (create/update)
   - Dashboard shows "Dashboard ระดับรองผู้อำนวยการ"

4. **Director/Admin Level User**
   - Can see all data
   - Can manage and delete reports
   - Dashboard shows "Dashboard ระดับผู้อำนวยการ" or "Dashboard ผู้ดูแลระบบ"

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

## Monitoring and Maintenance

### Database Views for User Management
Use the `user_roles_management` view to see all users and their statuses:

```sql
SELECT * FROM user_roles_management ORDER BY role_level DESC;
```

### Common Maintenance Tasks

1. **Add New User**
   ```sql
   INSERT INTO user_roles (email, role_level, role_name) 
   VALUES ('newuser@company.com', 2, 'Manager');
   ```

2. **Promote User**
   ```sql
   UPDATE user_roles 
   SET role_level = 3, role_name = 'Deputy Director' 
   WHERE email = 'user@company.com';
   ```

3. **Check User Permissions**
   ```sql
   SELECT * FROM get_user_role('user@company.com');
   ```

## Troubleshooting

### Common Issues

1. **User can't log in**
   - Check if email exists in `user_roles` table
   - Verify `is_active = true`
   - Check Supabase Auth configuration

2. **User sees wrong data**
   - Verify role level assignment
   - Check role-based filtering logic
   - Clear browser cache and cookies

3. **Database permission errors**
   - Ensure RLS policies are correctly applied
   - Check function permissions
   - Verify user is properly linked to role

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