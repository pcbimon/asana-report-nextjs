/**
 * Authentication context for managing user authentication state with role-based access and department support
 */

'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { User } from '@supabase/supabase-js';
import { createClient } from '../lib/supabase';
import { userRoleService } from '../lib/userRoleService';
import { UserRoleInfo, RolePermissions, UserDepartment, getRolePermissions } from '../types/userRoles';

interface AuthContextType {
  user: User | null;
  userRole: UserRoleInfo | null;
  userDepartments: UserDepartment[];
  currentDepartment: UserDepartment | null;
  permissions: RolePermissions | null;
  isLoading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: any }>;
  signOut: () => Promise<void>;
  refreshRole: () => Promise<void>;
  setCurrentDepartment: (department: UserDepartment) => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  userRole: null,
  userDepartments: [],
  currentDepartment: null,
  permissions: null,
  isLoading: true,
  signIn: async () => ({ error: null }),
  signOut: async () => {},
  refreshRole: async () => {},
  setCurrentDepartment: async () => {},
});

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [userRole, setUserRole] = useState<UserRoleInfo | null>(null);
  const [userDepartments, setUserDepartments] = useState<UserDepartment[]>([]);
  const [currentDepartment, setCurrentDepartmentState] = useState<UserDepartment | null>(null);
  const [permissions, setPermissions] = useState<RolePermissions | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Function to load user departments and set default department
  const loadUserDepartments = async (currentUser: User | null) => {
    if (!currentUser?.email) {
      setUserDepartments([]);
      setCurrentDepartmentState(null);
      return;
    }

    try {
      const departments = await userRoleService.getUserDepartments(currentUser.email);
      setUserDepartments(departments);
      
      // Set the first department as default (highest role level)
      const defaultDepartment = departments.length > 0 ? departments[0] : null;
      setCurrentDepartmentState(defaultDepartment);
      
      return defaultDepartment;
    } catch (error) {
      console.error('Error loading user departments:', error);
      setUserDepartments([]);
      setCurrentDepartmentState(null);
      return null;
    }
  };

  // Function to load user role and permissions for the current department
  const loadUserRole = async (currentUser: User | null, departmentId?: number) => {
    if (!currentUser?.email) {
      setUserRole(null);
      setPermissions(null);
      return;
    }

    try {
      const roleInfo = await userRoleService.getUserRole(currentUser.email, departmentId);
      setUserRole(roleInfo);
      
      if (roleInfo) {
        const userPermissions = getRolePermissions(
          roleInfo.role_level, 
          roleInfo.can_view_emails,
          currentDepartment || undefined,
          userDepartments.length > 1
        );
        setPermissions(userPermissions);
      } else {
        setPermissions(null);
      }
    } catch (error) {
      console.error('Error loading user role:', error);
      setUserRole(null);
      setPermissions(null);
    }
  };

  const refreshRole = async () => {
    await loadUserRole(user, currentDepartment?.department_id);
  };

  const setCurrentDepartment = async (department: UserDepartment) => {
    setCurrentDepartmentState(department);
    await loadUserRole(user, department.department_id);
  };

  useEffect(() => {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabasePublishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
    
    if (!supabaseUrl || !supabasePublishableKey) {
      setIsLoading(false);
      return;
    }

    const supabase = createClient();

    // Get initial session
    const getInitialSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      const currentUser = session?.user ?? null;
      setUser(currentUser);
      
      // Load user departments and role after setting user
      const defaultDepartment = await loadUserDepartments(currentUser);
      await loadUserRole(currentUser, defaultDepartment?.department_id);
      setIsLoading(false);
    };

    getInitialSession();

    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        const currentUser = session?.user ?? null;
        setUser(currentUser);
        
        // Load user departments and role after auth state change
        const defaultDepartment = await loadUserDepartments(currentUser);
        await loadUserRole(currentUser, defaultDepartment?.department_id);
        setIsLoading(false);
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  const signIn = async (email: string, password: string): Promise<{ error: any }> => {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabasePublishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
    
    if (!supabaseUrl || !supabasePublishableKey) {
      return { error: { message: 'Supabase not configured' } };
    }

    // Check if email is authorized before attempting sign in
    const isAuthorized = await userRoleService.isEmailAuthorized(email);
    if (!isAuthorized) {
      return { error: { message: 'อีเมลนี้ไม่ได้รับอนุญาตให้เข้าใช้ระบบ' } };
    }

    const supabase = createClient();

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    
    // If sign in successful, link user to role and load role info
    if (!error && data.user) {
      await userRoleService.linkUserToRole(email, data.user.id);
      const defaultDepartment = await loadUserDepartments(data.user);
      await loadUserRole(data.user, defaultDepartment?.department_id);
      
      return new Promise(resolve => {
        setTimeout(() => resolve({ error: null }), 500);
      });
    }
    
    return { error };
  };

  const signOut = async () => {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabasePublishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
    
    if (!supabaseUrl || !supabasePublishableKey) {
      return;
    }

    const supabase = createClient();
    await supabase.auth.signOut();
    
    // Clear role and department info on sign out
    setUserRole(null);
    setUserDepartments([]);
    setCurrentDepartmentState(null);
    setPermissions(null);
  };

  const value = {
    user,
    userRole,
    userDepartments,
    currentDepartment,
    permissions,
    isLoading,
    signIn,
    signOut,
    refreshRole,
    setCurrentDepartment,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}