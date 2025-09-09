/**
 * Middleware for route protection
 */

import { createMiddlewareClient } from '@supabase/auth-helpers-nextjs';
import { createServerClient } from '@supabase/ssr';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export async function middleware(req: NextRequest) {
  // Skip middleware if Supabase is not configured
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  
  if (!supabaseUrl || !supabaseAnonKey) {
    return NextResponse.next();
  }

  let res = NextResponse.next({
    request: {
      headers: req.headers,
    },
  });

  const supabase = createMiddlewareClient({ req, res }, { supabaseUrl, supabaseKey: supabaseAnonKey });

  // Refresh session if expired - required for Server Components
  const {
    data: { session },
  } = await supabase.auth.getSession();
  // Protected routes
  const protectedRoutes = ['/dashboard'];
  const isProtectedRoute = protectedRoutes.some(route => 
    req.nextUrl.pathname.startsWith(route)
  );
  return res;
  // // If accessing protected route without session, redirect to login
  // if (isProtectedRoute && !session) {
  //   console.log('Redirecting to login - no session');
  //   const redirectUrl = new URL('/login', req.url);
  //   return NextResponse.redirect(redirectUrl);
  // }

  // // If accessing login with session, redirect to dashboard
  // if (req.nextUrl.pathname === '/login' && session) {
  //   const redirectUrl = new URL('/dashboard', req.url);
  //   return NextResponse.redirect(redirectUrl);
  // }

  // return res;
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