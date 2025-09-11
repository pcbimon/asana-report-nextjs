/**
 * TypeScript types and interfaces for multi-level user role system with department support
 */

export enum UserRoleLevel {
  OPERATIONAL = 1,
  MANAGER = 2,
  DEPUTY_DIRECTOR = 3,
  DIRECTOR = 4,
  ADMIN = 5
}

export enum UserRoleName {
  OPERATIONAL = 'ปฏิบัติการ',
  MANAGER = 'หัวหน้างาน', 
  DEPUTY_DIRECTOR = 'รองผู้อำนวยการ',
  DIRECTOR = 'ผู้อำนวยการ',
  ADMIN = 'ผู้ดูแลระบบ'
}

export interface Department {
  id: number;
  department_code: string;
  department_name: string;
  department_name_th: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface UserRole {
  id: number;
  email: string;
  role_level: UserRoleLevel;
  role_name: string;
  department_id: number;
  user_id?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  created_by?: string;
}

export interface UserRoleInfo {
  role_level: UserRoleLevel;
  role_name: string;
  department_id: number;
  department_code: string;
  department_name: string;
  is_active: boolean;
  can_view_emails: string[];
}

export interface UserDepartment {
  department_id: number;
  department_code: string;
  department_name: string;
  role_level: UserRoleLevel;
  role_name: string;
}

export interface AuthUser {
  id: string;
  email: string;
  role?: UserRoleInfo;
  departments?: UserDepartment[];
}

export interface RolePermissions {
  canViewAllData: boolean;
  canViewOwnData: boolean;
  canSelectUsers: boolean;
  canSelectDepartments: boolean;
  canManageReports: boolean;
  canDeleteReports: boolean;
  viewableEmails: string[];
  currentDepartment?: UserDepartment;
}

/**
 * Get role permissions based on role level and department context
 */
export function getRolePermissions(
  roleLevel: UserRoleLevel, 
  viewableEmails: string[] = [],
  currentDepartment?: UserDepartment,
  haMultipleDepartments: boolean = false
): RolePermissions {
  const basePermissions = {
    viewableEmails,
    currentDepartment,
    canSelectDepartments: haMultipleDepartments
  };

  switch (roleLevel) {
    case UserRoleLevel.OPERATIONAL:
      return {
        ...basePermissions,
        canViewAllData: false,
        canViewOwnData: true,
        canSelectUsers: false,
        canManageReports: false,
        canDeleteReports: false
      };
    
    case UserRoleLevel.MANAGER:
      return {
        ...basePermissions,
        canViewAllData: false,
        canViewOwnData: true,
        canSelectUsers: true, // Can select operational level users in same department
        canManageReports: false,
        canDeleteReports: false
      };
    
    case UserRoleLevel.DEPUTY_DIRECTOR:
      return {
        ...basePermissions,
        canViewAllData: false,
        canViewOwnData: true,
        canSelectUsers: true, // Can select manager and operational level users in same department
        canManageReports: true, // Can create/update reports
        canDeleteReports: false
      };
    
    case UserRoleLevel.DIRECTOR:
      return {
        ...basePermissions,
        canViewAllData: true,
        canViewOwnData: true,
        canSelectUsers: true, // Can select all users across departments
        canManageReports: true,
        canDeleteReports: true // Can delete reports
      };
    
    case UserRoleLevel.ADMIN:
      return {
        ...basePermissions,
        canViewAllData: true,
        canViewOwnData: true,
        canSelectUsers: true, // Can select all users across all departments
        canManageReports: true,
        canDeleteReports: true // Can delete reports
      };
    
    default:
      return {
        ...basePermissions,
        canViewAllData: false,
        canViewOwnData: true,
        canSelectUsers: false,
        canManageReports: false,
        canDeleteReports: false
      };
  }
}

/**
 * Get role name in Thai
 */
export function getRoleNameThai(roleLevel: UserRoleLevel): string {
  switch (roleLevel) {
    case UserRoleLevel.OPERATIONAL:
      return UserRoleName.OPERATIONAL;
    case UserRoleLevel.MANAGER:
      return UserRoleName.MANAGER;
    case UserRoleLevel.DEPUTY_DIRECTOR:
      return UserRoleName.DEPUTY_DIRECTOR;
    case UserRoleLevel.DIRECTOR:
      return UserRoleName.DIRECTOR;
    case UserRoleLevel.ADMIN:
      return UserRoleName.ADMIN;
    default:
      return 'ไม่ระบุ';
  }
}

/**
 * Check if a role can view another role's data within the same department
 */
export function canViewRole(
  viewerRoleLevel: UserRoleLevel, 
  targetRoleLevel: UserRoleLevel,
  sameDeppartment: boolean = true
): boolean {
  // Director and Admin can view all across departments
  if (viewerRoleLevel >= UserRoleLevel.DIRECTOR) {
    return true;
  }
  
  // For other roles, must be same department
  if (!sameDeppartment) {
    return false;
  }
  
  // Deputy Director can view Manager and Operational in same department
  if (viewerRoleLevel === UserRoleLevel.DEPUTY_DIRECTOR && targetRoleLevel <= UserRoleLevel.DEPUTY_DIRECTOR) {
    return true;
  }
  
  // Manager can view Operational and themselves in same department
  if (viewerRoleLevel === UserRoleLevel.MANAGER && targetRoleLevel <= UserRoleLevel.MANAGER) {
    return true;
  }
  
  // Operational can only view themselves
  if (viewerRoleLevel === UserRoleLevel.OPERATIONAL && targetRoleLevel === UserRoleLevel.OPERATIONAL) {
    return true;
  }
  
  return false;
}

/**
 * Filter users based on role permissions and department access
 */
export function filterUsersByRole(
  users: Array<{ email?: string; gid: string; name: string }>, 
  userRoleLevel: UserRoleLevel, 
  userEmail: string,
  departmentContext?: { canViewEmails: string[] }
): Array<{ email?: string; gid: string; name: string }> {
  if (userRoleLevel >= UserRoleLevel.DIRECTOR) {
    return users; // Director and Admin see all
  }
  
  if (userRoleLevel === UserRoleLevel.OPERATIONAL) {
    return users.filter(user => user.email === userEmail); // Only own data
  }
  
  // For Manager and Deputy Director, filter by department-based viewable emails
  if (departmentContext?.canViewEmails) {
    return users.filter(user => 
      !user.email || departmentContext.canViewEmails.includes(user.email)
    );
  }
  
  // Fallback to own data only
  return users.filter(user => user.email === userEmail);
}

/**
 * Get department display name with fallback
 */
export function getDepartmentDisplayName(department?: UserDepartment): string {
  if (!department) return 'ไม่ระบุฝ่าย';
  return department.department_name || department.department_code || 'ไม่ระบุฝ่าย';
}

/**
 * Format user role with department context
 */
export function formatUserRoleWithDepartment(
  roleName: string,
  departmentName?: string
): string {
  if (!departmentName) return roleName;
  return `${roleName} (${departmentName})`;
}