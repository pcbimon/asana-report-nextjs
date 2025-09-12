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
      // Retry with exponential backoff in case the API is slow/unreliable.
      // This will attempt to load departments several times before giving up,
      // waiting a bit longer between each attempt. Each attempt has a per-attempt timeout.
      const maxAttempts = 5;
      const initialDelayMs = 1000; // 1s
      const maxDelayMs = 10000; // cap at 10s
      const perAttemptTimeoutMs = 10000; // per-attempt timeout

      const sleep = (ms: number) => new Promise(res => setTimeout(res, ms));

      let attempt = 0;
      let delay = initialDelayMs;
      let lastError: any = null;

      while (attempt < maxAttempts) {
        attempt += 1;
        try {
          // Add per-attempt timeout to avoid hanging forever on one request
          const departments = await Promise.race([
            userRoleService.getUserDepartments(currentUser.email),
            new Promise((_, reject) => setTimeout(() => reject(new Error('Department loading timeout')), perAttemptTimeoutMs)),
          ]) as UserDepartment[];

          // success
          setUserDepartments(departments);

          // Set the first department as default (highest role level)
          const defaultDepartment = departments.length > 0 ? departments[0] : null;
          setCurrentDepartmentState(defaultDepartment);
          return defaultDepartment;
        } catch (err) {
          lastError = err;
          // If final attempt, fall through to error handling below
          if (attempt >= maxAttempts) break;

          // exponential backoff with small jitter
          const jitter = Math.floor(Math.random() * 300);
          const waitMs = Math.min(delay, maxDelayMs) + jitter;
          // eslint-disable-next-line no-console
          console.warn(`getUserDepartments attempt ${attempt} failed, retrying in ${waitMs}ms`, err);
          // wait before next attempt
          // Note: not abortable here; callers can rely on outer mounted checks
          // to avoid applying state after unmount.
          // eslint-disable-next-line no-await-in-loop
          await sleep(waitMs);
          delay = Math.min(delay * 2, maxDelayMs);
        }
      }

      // All attempts failed
      console.error('Error loading user departments (all retries failed):', lastError);
      setUserDepartments([]);
      setCurrentDepartmentState(null);
      return null;
    } catch (error) {
      // Fallback: should rarely happen, but keep original safe behavior
      console.error('Unexpected error loading user departments:', error);
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
      // Retry with exponential backoff for role loading in case the API is slow/unreliable.
      const maxAttempts = 4;
      const initialDelayMs = 500; // start a bit quicker for role
      const maxDelayMs = 8000;
      const perAttemptTimeoutMs = 8000;

      const sleep = (ms: number) => new Promise(res => setTimeout(res, ms));

      let attempt = 0;
      let delay = initialDelayMs;
      let lastError: any = null;

      while (attempt < maxAttempts) {
        attempt += 1;
        try {
          const roleInfo = await Promise.race([
            userRoleService.getUserRole(currentUser.email, departmentId),
            new Promise((_, reject) => setTimeout(() => reject(new Error('Role loading timeout')), perAttemptTimeoutMs)),
          ]) as UserRoleInfo | null;

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

          return;
        } catch (err) {
          lastError = err;
          if (attempt >= maxAttempts) break;

          const jitter = Math.floor(Math.random() * 200);
          const waitMs = Math.min(delay, maxDelayMs) + jitter;
          // eslint-disable-next-line no-console
          console.warn(`getUserRole attempt ${attempt} failed, retrying in ${waitMs}ms`, err);
          // eslint-disable-next-line no-await-in-loop
          await sleep(waitMs);
          delay = Math.min(delay * 2, maxDelayMs);
        }
      }

      console.error('Error loading user role (all retries failed):', lastError);
      setUserRole(null);
      setPermissions(null);
      return;
    } catch (error) {
      console.error('Unexpected error loading user role:', error);
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
      console.warn('Supabase configuration not found - authentication disabled');
      setIsLoading(false);
      return;
    }

    const supabase = createClient();
    let mounted = true; // Track component mount status

    // Get initial session with timeout
    const getInitialSession = async () => {
      try {
        // Set a timeout for the session request
        const sessionPromise = supabase.auth.getSession();
        const timeoutPromise = new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Session request timeout')), 10000)
        );
        
        const { data: { session } } = await Promise.race([sessionPromise, timeoutPromise]) as any;
        
        if (!mounted) return; // Component unmounted
        
        const currentUser = session?.user ?? null;
        setUser(currentUser);
        
        // Load user departments and role after setting user
        if (currentUser) {
          const defaultDepartment = await loadUserDepartments(currentUser);
          if (mounted) {
            await loadUserRole(currentUser, defaultDepartment?.department_id);
          }
        }
        
        if (mounted) {
          setIsLoading(false);
        }
      } catch (error) {
        console.error('Error loading initial session:', error);
        if (mounted) {
          setIsLoading(false);
          // Still allow access without authentication
        }
      }
    };

    getInitialSession();

    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (!mounted) return;
        
        try {
          const currentUser = session?.user ?? null;
          setUser(currentUser);
          
          // Load user departments and role after auth state change
          if (currentUser) {
            const defaultDepartment = await loadUserDepartments(currentUser);
            if (mounted) {
              await loadUserRole(currentUser, defaultDepartment?.department_id);
            }
          }
          
          if (mounted) {
            setIsLoading(false);
          }
        } catch (error) {
          console.error('Error in auth state change:', error);
          if (mounted) {
            setIsLoading(false);
          }
        }
      }
    );

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
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