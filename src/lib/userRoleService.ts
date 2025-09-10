/**
 * User Role Service for Supabase integration
 * Handles role-based authentication and data access
 */

import { createClient } from './supabase';
import { UserRoleInfo, UserRole, UserRoleLevel } from '../types/userRoles';

export class UserRoleService {
  private supabase = createClient();

  /**
   * Get user role information for current user or specified email
   */
  async getUserRole(email?: string): Promise<UserRoleInfo | null> {
    try {
      const { data, error } = await this.supabase
        .rpc('get_user_role', email ? { user_email: email } : {});

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
        is_active: roleData.is_active,
        can_view_emails: roleData.can_view_emails || []
      };
    } catch (error) {
      console.error('Error in getUserRole:', error);
      return null;
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
   * Create a new user role (admin only)
   */
  async createUserRole(
    email: string, 
    roleLevel: UserRoleLevel, 
    roleName: string
  ): Promise<boolean> {
    try {
      const { error } = await this.supabase
        .from('user_roles')
        .insert({
          email,
          role_level: roleLevel,
          role_name: roleName,
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
    updates: Partial<Pick<UserRole, 'role_level' | 'role_name' | 'is_active'>>
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
   * Get filtered assignees based on user role
   */
  async getViewableAssignees(currentUserEmail: string): Promise<string[]> {
    try {
      const roleInfo = await this.getUserRole(currentUserEmail);
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
   * Filter assignees list based on current user's role
   */
  filterAssigneesByRole(assignees: Array<{ email?: string; gid: string; name: string }>, viewableEmails: string[]): Array<{ email?: string; gid: string; name: string }> {
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
  async canPerformAction(action: 'view_all' | 'manage_reports' | 'delete_reports'): Promise<boolean> {
    try {
      const roleInfo = await this.getUserRole();
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
}

// Export singleton instance
export const userRoleService = new UserRoleService();