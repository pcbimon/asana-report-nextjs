/**
 * User Role Service for Supabase integration with department support
 * Handles role-based authentication and data access within departments
 */

import { createClient } from './supabase';
import { UserRoleInfo, UserRole, UserRoleLevel, Department, UserDepartment } from '../types/userRoles';

export class UserRoleService {
  private supabase = createClient();

  /**
   * Get user role information for current user or specified email in a specific department
   */
  async getUserRole(email?: string, departmentId?: number): Promise<UserRoleInfo | null> {
    try {
      const { data, error } = await this.supabase
        .rpc('get_user_role', { 
          user_email: email || null,
          dept_id: departmentId || null 
        });

      if (error) {
        console.error('Error fetching user role:', error);
        return null;
      }

      if (!data || data.length === 0) {
        return null;
      }

      const roleData = data[0];
      return {
        role_level: roleData.role_level,
        role_name: roleData.role_name,
        department_id: roleData.department_id,
        department_code: roleData.department_code,
        department_name: roleData.department_name,
        is_active: roleData.is_active,
        can_view_emails: roleData.can_view_emails || []
      };
    } catch (error) {
      console.error('Error in getUserRole:', error);
      return null;
    }
  }

  /**
   * Get all departments a user has access to
   */
  async getUserDepartments(email?: string): Promise<UserDepartment[]> {
    try {
      const { data, error } = await this.supabase
        .rpc('get_user_departments', { user_email: email || null });

      if (error) {
        console.error('Error fetching user departments:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('Error in getUserDepartments:', error);
      return [];
    }
  }

  /**
   * Get all active departments
   */
  async getAllDepartments(): Promise<Department[]> {
    try {
      const { data, error } = await this.supabase
        .from('departments')
        .select('*')
        .eq('is_active', true)
        .order('department_name_th');

      if (error) {
        console.error('Error fetching departments:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('Error in getAllDepartments:', error);
      return [];
    }
  }

  /**
   * Check if an email is authorized for registration
   */
  async isEmailAuthorized(email: string): Promise<boolean> {
    try {
      const { data, error } = await this.supabase
        .rpc('is_email_authorized', { user_email: email });

      if (error) {
        console.error('Error checking email authorization:', error);
        return false;
      }

      return data === true;
    } catch (error) {
      console.error('Error in isEmailAuthorized:', error);
      return false;
    }
  }

  /**
   * Update user_id in user_roles table when user signs up
   */
  async linkUserToRole(email: string, userId: string): Promise<boolean> {
    try {
      const { error } = await this.supabase
        .from('user_roles')
        .update({ user_id: userId, updated_at: new Date().toISOString() })
        .eq('email', email)
        .eq('is_active', true);

      if (error) {
        console.error('Error linking user to role:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Error in linkUserToRole:', error);
      return false;
    }
  }

  /**
   * Get all user roles (admin only)
   */
  async getAllUserRoles(): Promise<UserRole[]> {
    try {
      const { data, error } = await this.supabase
        .from('user_roles_management')
        .select('*')
        .order('role_level', { ascending: false });

      if (error) {
        console.error('Error fetching all user roles:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('Error in getAllUserRoles:', error);
      return [];
    }
  }

  /**
   * Create a new user role with department assignment (admin only)
   */
  async createUserRole(
    email: string, 
    roleLevel: UserRoleLevel, 
    roleName: string,
    departmentId: number
  ): Promise<boolean> {
    try {
      const { error } = await this.supabase
        .from('user_roles')
        .insert({
          email,
          role_level: roleLevel,
          role_name: roleName,
          department_id: departmentId,
          is_active: true
        });

      if (error) {
        console.error('Error creating user role:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Error in createUserRole:', error);
      return false;
    }
  }

  /**
   * Update user role (admin only)
   */
  async updateUserRole(
    id: number,
    updates: Partial<Pick<UserRole, 'role_level' | 'role_name' | 'department_id' | 'is_active'>>
  ): Promise<boolean> {
    try {
      const { error } = await this.supabase
        .from('user_roles')
        .update({
          ...updates,
          updated_at: new Date().toISOString()
        })
        .eq('id', id);

      if (error) {
        console.error('Error updating user role:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Error in updateUserRole:', error);
      return false;
    }
  }

  /**
   * Deactivate user role (admin only)
   */
  async deactivateUserRole(id: number): Promise<boolean> {
    try {
      const { error } = await this.supabase
        .from('user_roles')
        .update({
          is_active: false,
          updated_at: new Date().toISOString()
        })
        .eq('id', id);

      if (error) {
        console.error('Error deactivating user role:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Error in deactivateUserRole:', error);
      return false;
    }
  }

  /**
   * Get filtered assignees based on user role and department
   */
  async getViewableAssignees(currentUserEmail: string, departmentId?: number): Promise<string[]> {
    try {
      const roleInfo = await this.getUserRole(currentUserEmail, departmentId);
      if (!roleInfo) {
        return [currentUserEmail]; // Fallback to own email only
      }

      return roleInfo.can_view_emails;
    } catch (error) {
      console.error('Error in getViewableAssignees:', error);
      return [currentUserEmail]; // Fallback to own email only
    }
  }

  /**
   * Filter assignees list based on current user's role and department access
   */
  filterAssigneesByRole(
    assignees: Array<{ email?: string; gid: string; name: string }>, 
    viewableEmails: string[]
  ): Array<{ email?: string; gid: string; name: string }> {
    if (!assignees || assignees.length === 0) {
      return [];
    }

    return assignees.filter(assignee => {
      // If assignee has email, check if it's in viewable emails
      if (assignee.email) {
        return viewableEmails.includes(assignee.email);
      }
      
      // If no email, allow (for backward compatibility)
      return true;
    });
  }

  /**
   * Check if current user can perform an action based on role level
   */
  async canPerformAction(
    action: 'view_all' | 'manage_reports' | 'delete_reports',
    departmentId?: number
  ): Promise<boolean> {
    try {
      const roleInfo = await this.getUserRole(undefined, departmentId);
      if (!roleInfo) {
        return false;
      }

      switch (action) {
        case 'view_all':
          return roleInfo.role_level >= UserRoleLevel.DIRECTOR;
        case 'manage_reports':
          return roleInfo.role_level >= UserRoleLevel.DEPUTY_DIRECTOR;
        case 'delete_reports':
          return roleInfo.role_level >= UserRoleLevel.DIRECTOR;
        default:
          return false;
      }
    } catch (error) {
      console.error('Error in canPerformAction:', error);
      return false;
    }
  }

  /**
   * Create a new department (admin only)
   */
  async createDepartment(
    departmentCode: string,
    departmentName: string,
    departmentNameTh: string
  ): Promise<boolean> {
    try {
      const { error } = await this.supabase
        .from('departments')
        .insert({
          department_code: departmentCode,
          department_name: departmentName,
          department_name_th: departmentNameTh,
          is_active: true
        });

      if (error) {
        console.error('Error creating department:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Error in createDepartment:', error);
      return false;
    }
  }

  /**
   * Update department (admin only)
   */
  async updateDepartment(
    id: number,
    updates: Partial<Pick<Department, 'department_name' | 'department_name_th' | 'is_active'>>
  ): Promise<boolean> {
    try {
      const { error } = await this.supabase
        .from('departments')
        .update({
          ...updates,
          updated_at: new Date().toISOString()
        })
        .eq('id', id);

      if (error) {
        console.error('Error updating department:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Error in updateDepartment:', error);
      return false;
    }
  }
}

// Export singleton instance
export const userRoleService = new UserRoleService();