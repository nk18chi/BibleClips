import { createServerClient as createSupabaseServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

type CookieToSet = { name: string; value: string; options?: object };

export function createServerClient() {
  return createSupabaseServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          const cookieStore = cookies();
          return cookieStore.getAll();
        },
        setAll(cookiesToSet: CookieToSet[]) {
          try {
            const cookieStore = cookies();
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // The `setAll` method was called from a Server Component.
            // This can be ignored if you have middleware refreshing user sessions.
          }
        },
      },
    }
  );
}

/**
 * Get session from cookie manually - workaround for Supabase SSR bug
 * where getSession() returns null in Server Components/Route Handlers.
 *
 * @see https://github.com/supabase/auth-helpers/issues/684
 */
export function getSessionFromCookie(): { user: { id: string; email?: string } } | null {
  const cookieStore = cookies();
  const allCookies = cookieStore.getAll();
  const authCookie = allCookies.find(
    (c) => c.name.includes("auth-token") && !c.name.includes("code-verifier")
  );

  if (!authCookie) return null;

  try {
    const session = JSON.parse(authCookie.value);
    return { user: session.user };
  } catch {
    return null;
  }
}
