/**
 * Middleware for route protection with role-based access control
 */

import { createServerClient } from '@supabase/ssr';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export async function middleware(req: NextRequest) {
  // Skip middleware if Supabase is not configured
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabasePublishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  
  if (!supabaseUrl || !supabasePublishableKey) {
    return NextResponse.next();
  }

  let response = NextResponse.next({
    request: {
      headers: req.headers,
    },
  });

  const supabase = createServerClient(
    supabaseUrl,
    supabasePublishableKey,
    {
      cookies: {
        getAll() {
          return req.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => req.cookies.set(name, value));
          response = NextResponse.next({
            request: {
              headers: req.headers,
            },
          });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // Refresh session if expired - required for Server Components
  const {
    data: { session },
  } = await supabase.auth.getSession();

  // Protected routes
  const protectedRoutes = ['/dashboard'];
  const isProtectedRoute = protectedRoutes.some(route => 
    req.nextUrl.pathname.startsWith(route)
  );

  // If accessing protected route without session, redirect to login
  if (isProtectedRoute && !session) {
    const redirectUrl = new URL('/login', req.url);
    return NextResponse.redirect(redirectUrl);
  }

  // If accessing login with session, check role and redirect appropriately
  if (req.nextUrl.pathname === '/login' && session) {
    try {
      // Check if user has a valid role
      const { data: roleData } = await supabase
        .rpc('get_user_role')
        .single();

      if (roleData && (roleData as any).is_active) {
        const redirectUrl = new URL('/dashboard', req.url);
        return NextResponse.redirect(redirectUrl);
      } else {
        // User has session but no valid role - sign them out
        await supabase.auth.signOut();
        return NextResponse.next();
      }
    } catch (error) {
      console.error('Error checking user role in middleware:', error);
      // Continue to login page if role check fails
      return NextResponse.next();
    }
  }

  // For protected routes, verify user has an active role
  if (isProtectedRoute && session) {
    try {
      const { data: roleData } = await supabase
        .rpc('get_user_role')
        .single();

      if (!roleData || !(roleData as any).is_active) {
        // User has session but no valid role - redirect to login with error
        const redirectUrl = new URL('/login?error=no_role', req.url);
        return NextResponse.redirect(redirectUrl);
      }
    } catch (error) {
      console.error('Error verifying user role:', error);
      // Allow access on error to avoid breaking functionality
    }
  }

  return response;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
};