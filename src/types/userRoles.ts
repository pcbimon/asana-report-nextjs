/**
 * TypeScript types and interfaces for multi-level user role system
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

export interface UserRole {
  id: number;
  email: string;
  role_level: UserRoleLevel;
  role_name: string;
  user_id?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  created_by?: string;
}

export interface UserRoleInfo {
  role_level: UserRoleLevel;
  role_name: string;
  is_active: boolean;
  can_view_emails: string[];
}

export interface AuthUser {
  id: string;
  email: string;
  role?: UserRoleInfo;
}

export interface RolePermissions {
  canViewAllData: boolean;
  canViewOwnData: boolean;
  canSelectUsers: boolean;
  canManageReports: boolean;
  canDeleteReports: boolean;
  viewableEmails: string[];
}

/**
 * Get role permissions based on role level
 */
export function getRolePermissions(roleLevel: UserRoleLevel, viewableEmails: string[] = []): RolePermissions {
  switch (roleLevel) {
    case UserRoleLevel.OPERATIONAL:
      return {
        canViewAllData: false,
        canViewOwnData: true,
        canSelectUsers: false,
        canManageReports: false,
        canDeleteReports: false,
        viewableEmails
      };
    
    case UserRoleLevel.MANAGER:
      return {
        canViewAllData: false,
        canViewOwnData: true,
        canSelectUsers: true, // Can select operational level users
        canManageReports: false,
        canDeleteReports: false,
        viewableEmails
      };
    
    case UserRoleLevel.DEPUTY_DIRECTOR:
      return {
        canViewAllData: false,
        canViewOwnData: true,
        canSelectUsers: true, // Can select manager and operational level users
        canManageReports: true, // Can create/update reports
        canDeleteReports: false,
        viewableEmails
      };
    
    case UserRoleLevel.DIRECTOR:
      return {
        canViewAllData: true,
        canViewOwnData: true,
        canSelectUsers: true, // Can select all users
        canManageReports: true,
        canDeleteReports: true, // Can delete reports
        viewableEmails
      };
    
    case UserRoleLevel.ADMIN:
      return {
        canViewAllData: true,
        canViewOwnData: true,
        canSelectUsers: true, // Can select all users
        canManageReports: true,
        canDeleteReports: true, // Can delete reports
        viewableEmails
      };
    
    default:
      return {
        canViewAllData: false,
        canViewOwnData: true,
        canSelectUsers: false,
        canManageReports: false,
        canDeleteReports: false,
        viewableEmails: []
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
 * Check if a role can view another role's data
 */
export function canViewRole(viewerRoleLevel: UserRoleLevel, targetRoleLevel: UserRoleLevel): boolean {
  // Director and Admin can view all
  if (viewerRoleLevel >= UserRoleLevel.DIRECTOR) {
    return true;
  }
  
  // Deputy Director can view Manager and Operational
  if (viewerRoleLevel === UserRoleLevel.DEPUTY_DIRECTOR && targetRoleLevel <= UserRoleLevel.DEPUTY_DIRECTOR) {
    return true;
  }
  
  // Manager can view Operational and themselves
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
 * Filter users based on role permissions
 */
export function filterUsersByRole(users: Array<{ email?: string; gid: string; name: string }>, userRoleLevel: UserRoleLevel, userEmail: string): Array<{ email?: string; gid: string; name: string }> {
  if (userRoleLevel >= UserRoleLevel.DIRECTOR) {
    return users; // Director and Admin see all
  }
  
  if (userRoleLevel === UserRoleLevel.OPERATIONAL) {
    return users.filter(user => user.email === userEmail); // Only own data
  }
  
  // For Manager and Deputy Director, filter will be handled by the backend
  // based on the viewableEmails list from the database function
  return users;
}