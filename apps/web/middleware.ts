import { type NextRequest, NextResponse } from "next/server";
import { parseUserFromAuthCookies } from "@/lib/supabase/parse-auth-cookie";

export async function middleware(request: NextRequest) {
  const user = parseUserFromAuthCookies(request.cookies.getAll());

  // Protected routes that require authentication
  // Note: /workspace uses client-side auth + API route auth
  const protectedPaths = ["/submit", "/my-clips", "/admin"];
  const isProtectedPath = protectedPaths.some((path) => request.nextUrl.pathname.startsWith(path));

  // Redirect old /verse/book/chapter/verse URLs to flat /verse/book-chapter-verse
  const oldVerseMatch = request.nextUrl.pathname.match(/^\/verse\/([^/]+)\/(\d+)\/(\d+)$/);
  if (oldVerseMatch) {
    const [, book, chapter, verse] = oldVerseMatch;
    return NextResponse.redirect(new URL(`/verse/${book}-${chapter}-${verse}`, request.url), 301);
  }

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
