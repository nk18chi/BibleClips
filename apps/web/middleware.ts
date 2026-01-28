import { type NextRequest, NextResponse } from "next/server";

/**
 * Get user from auth cookie - workaround for Supabase SSR bug
 * where getUser() returns null in middleware.
 */
function getUserFromCookie(request: NextRequest): { id: string } | null {
  const allCookies = request.cookies.getAll();
  const authCookie = allCookies.find(
    (c) => c.name.includes("auth-token") && !c.name.includes("code-verifier")
  );

  if (!authCookie) return null;

  try {
    const session = JSON.parse(authCookie.value);
    return session.user;
  } catch {
    return null;
  }
}

export async function middleware(request: NextRequest) {
  const user = getUserFromCookie(request);

  // Protected routes that require authentication
  // Note: /workspace uses client-side auth + API route auth
  const protectedPaths = ["/submit", "/my-clips", "/admin"];
  const isProtectedPath = protectedPaths.some((path) => request.nextUrl.pathname.startsWith(path));

  if (isProtectedPath && !user) {
    const redirectUrl = new URL("/login", request.url);
    redirectUrl.searchParams.set("redirectTo", request.nextUrl.pathname);
    return NextResponse.redirect(redirectUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};
