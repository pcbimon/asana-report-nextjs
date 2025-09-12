/**
 * Authentication context for managing user authentication state with role-based access and department support
 */

 'use client';

import React, { createContext, useContext, useEffect, useState, useRef } from 'react';
import { User } from '@supabase/supabase-js';
import { createClient } from '../lib/supabase';
import { userRoleService } from '../lib/userRoleService';
import { UserRoleInfo, RolePermissions, UserDepartment, getRolePermissions } from '../types/userRoles';

// RxJS imports for declarative streams, retry/backoff, cancellation
import { BehaviorSubject, Subject, defer, from, of, combineLatest, firstValueFrom } from 'rxjs';
import {
  switchMap,
  catchError,
  timeout,
  takeUntil,
  shareReplay,
  startWith,
} from 'rxjs/operators';

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

  // --- RxJS subjects / streams ---
  // useRef to keep stable subjects across re-renders
  const user$Ref = useRef<BehaviorSubject<User | null> | null>(null);
  const deptSelection$Ref = useRef<BehaviorSubject<number | undefined> | null>(null);
  const unmount$Ref = useRef<Subject<void> | null>(null);

  if (!user$Ref.current) user$Ref.current = new BehaviorSubject<User | null>(null);
  if (!deptSelection$Ref.current) deptSelection$Ref.current = new BehaviorSubject<number | undefined>(undefined);
  if (!unmount$Ref.current) unmount$Ref.current = new Subject<void>();

  const user$ = user$Ref.current;
  const deptSelection$ = deptSelection$Ref.current;
  const unmount$ = unmount$Ref.current;

  // Helper: wrap promise in observable with a single attempt and timeout (no retry)
  const fetchOnce$ = <T,>(fn: () => Promise<T>, perAttemptTimeoutMs = 8000) =>
    defer(() => from(fn())).pipe(
      timeout(perAttemptTimeoutMs),
      catchError(() => of(null as unknown as T))
    );

  // departments$ - emits array of UserDepartment when user$ emits
  const departments$ = user$.pipe(
    switchMap(u => {
      if (!u?.email) return of([] as UserDepartment[]);
      return fetchOnce$(() => userRoleService.getUserDepartments(u.email), 10000);
    }),
    takeUntil(unmount$),
    shareReplay(1)
  );

  // role$ - depends on current user and selected department id
  const role$ = combineLatest([user$, deptSelection$.pipe(startWith(undefined))]).pipe(
    switchMap(([u, deptId]) => {
      if (!u?.email) return of(null as UserRoleInfo | null);
      return fetchOnce$(() => userRoleService.getUserRole(u.email, deptId), 8000);
    }),
    takeUntil(unmount$),
    shareReplay(1)
  );

  // Function to load user departments and set default department
  const loadUserDepartments = async (currentUser: User | null) => {
    // Keep backward-compatible function that triggers the user$ stream and
    // returns the currently known departments (subscribers will update state).
    if (!currentUser?.email) {
      // push null user so departments$ yields []
      user$.next(null);
      return null;
    }

    // push user into stream which triggers departments$ to load
    user$.next(currentUser);

    // Wait for departments$ to emit at least once. We can't easily await an Observable
    // without extra helpers here; keep existing behavior by returning current cached
    // departments state if available.
    return userDepartments.length > 0 ? userDepartments[0] : null;
  };

  // Function to load user role and permissions for the current department
  const loadUserRole = async (currentUser: User | null, departmentId?: number) => {
    // Thin wrapper: push user and department selection into streams. The role$ subscriber
    // will update React state.
    if (!currentUser?.email) {
      user$.next(null);
      deptSelection$.next(undefined);
      return;
    }

    // emit user and selected department id to trigger role$ to load
    user$.next(currentUser);
    deptSelection$.next(departmentId);
  };

  const refreshRole = async () => {
    // trigger a role reload for the current department
    await loadUserRole(user, currentDepartment?.department_id);
  };

  const setCurrentDepartment = async (department: UserDepartment) => {
    setCurrentDepartmentState(department);
    // push department id into stream to reload role
    deptSelection$.next(department.department_id);
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

    // Get initial session using RxJS observable + timeout (no retry)
    const getInitialSession = async () => {
      try {
        const perAttemptTimeoutMs = 10000;

        const session$ = defer(() => from(supabase.auth.getSession())).pipe(
          // supabase.auth.getSession() resolves to { data: { session } }
          // we use timeout to avoid waiting forever
          timeout(perAttemptTimeoutMs),
          catchError(() => of(null as any))
        );

        const result = await firstValueFrom(session$);
        if (!mounted) return;

        const session = result?.data?.session ?? null;
        if (!session) {
          setIsLoading(false);
          return;
        }

        const currentUser = session?.user ?? null;
        setUser(currentUser);

        // push user into stream so departments/role load via observables
        if (currentUser) user$.next(currentUser);

        setIsLoading(false);
      } catch (error) {
        console.error('Unexpected error loading initial session:', error);
        if (mounted) setIsLoading(false);
      }
    };

    // Subscribe to departments$ and role$ to update React state when streams emit.
    const deptSub = departments$.subscribe(depts => {
      setUserDepartments(depts ?? []);
      const defaultDept = (depts && depts.length > 0) ? depts[0] : null;
      setCurrentDepartmentState(defaultDept);
      if (defaultDept) deptSelection$.next(defaultDept.department_id);
    });

    const roleSub = role$.subscribe(roleInfo => {
      setUserRole(roleInfo ?? null);

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
    });

    // Now run initial session logic (keeps same retry semantics as before)
    getInitialSession();

    // Listen for auth state changes and push user into stream when changed
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (!mounted) return;

        try {
          const currentUser = session?.user ?? null;
          setUser(currentUser);

          // push the user into the stream to trigger department/role loads
          user$.next(currentUser);

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

    // cleanup: cancel rxjs streams and supabase subscription
    return () => {
      mounted = false;
      try {
        subscription.unsubscribe();
      } catch (e) {
        // ignore
      }
      // notify observables to complete/takeUntil
      unmount$.next();
      unmount$.complete();
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
    
    // If sign in successful, link user to role and push into streams to load data
    if (!error && data.user) {
      await userRoleService.linkUserToRole(email, data.user.id);

      // push user into stream; subscribers will load departments and role
      user$.next(data.user);

      // small delay to allow streams to start; keep a short promise for existing callers
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