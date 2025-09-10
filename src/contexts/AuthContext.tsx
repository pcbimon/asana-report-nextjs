/**
 * Authentication context for managing user authentication state with role-based access
 */

'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { User } from '@supabase/supabase-js';
import { createClient } from '../lib/supabase';
import { userRoleService } from '../lib/userRoleService';
import { UserRoleInfo, RolePermissions, getRolePermissions } from '../types/userRoles';

interface AuthContextType {
  user: User | null;
  userRole: UserRoleInfo | null;
  permissions: RolePermissions | null;
  isLoading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: any }>;
  signOut: () => Promise<void>;
  refreshRole: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  userRole: null,
  permissions: null,
  isLoading: true,
  signIn: async () => ({ error: null }),
  signOut: async () => {},
  refreshRole: async () => {},
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
  const [permissions, setPermissions] = useState<RolePermissions | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Function to load user role and permissions
  const loadUserRole = async (currentUser: User | null) => {
    if (!currentUser?.email) {
      setUserRole(null);
      setPermissions(null);
      return;
    }

    try {
      const roleInfo = await userRoleService.getUserRole(currentUser.email);
      setUserRole(roleInfo);
      
      if (roleInfo) {
        const userPermissions = getRolePermissions(roleInfo.role_level, roleInfo.can_view_emails);
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
    await loadUserRole(user);
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
      
      // Load user role after setting user
      await loadUserRole(currentUser);
      setIsLoading(false);
    };

    getInitialSession();

    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        const currentUser = session?.user ?? null;
        setUser(currentUser);
        
        // Load user role after auth state change
        await loadUserRole(currentUser);
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
      await loadUserRole(data.user);
      
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
    
    // Clear role info on sign out
    setUserRole(null);
    setPermissions(null);
  };

  const value = {
    user,
    userRole,
    permissions,
    isLoading,
    signIn,
    signOut,
    refreshRole,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}