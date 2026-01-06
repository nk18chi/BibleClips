import { createMiddlewareClient } from '@supabase/auth-helpers-nextjs';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export async function middleware(req: NextRequest) {
  const res = NextResponse.next();
  const supabase = createMiddlewareClient({ req, res });

  const {
    data: { session },
  } = await supabase.auth.getSession();

  // Protected routes that require authentication
  const protectedPaths = ['/submit', '/my-clips', '/admin'];
  const isProtectedPath = protectedPaths.some(path =>
    req.nextUrl.pathname.startsWith(path)
  );

  // Admin routes require admin role
  const adminPaths = ['/admin'];
  const isAdminPath = adminPaths.some(path =>
    req.nextUrl.pathname.startsWith(path)
  );

  if (isProtectedPath && !session) {
    const redirectUrl = new URL('/login', req.url);
    redirectUrl.searchParams.set('redirectTo', req.nextUrl.pathname);
    return NextResponse.redirect(redirectUrl);
  }

  // For admin routes, check role (will be checked again in component)
  if (isAdminPath && session) {
    // Role check happens in the page component with RLS
  }

  return res;
}

export const config = {
  matcher: ['/submit/:path*', '/my-clips/:path*', '/admin/:path*'],
};
