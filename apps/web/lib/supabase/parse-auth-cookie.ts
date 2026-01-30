/**
 * Parse user from Supabase auth cookies.
 *
 * Handles both plain JSON and base64-encoded values (prefixed with "base64-"),
 * as well as chunked cookies (e.g. sb-xxx-auth-token.0, .1, .2).
 */
export function parseUserFromAuthCookies(
  allCookies: { name: string; value: string }[]
): { id: string; email?: string } | null {
  const authCookies = allCookies
    .filter((c) => c.name.includes("auth-token") && !c.name.includes("code-verifier"))
    .sort((a, b) => a.name.localeCompare(b.name));

  if (authCookies.length === 0) return null;

  try {
    let value = authCookies.map((c) => c.value).join("");
    if (value.startsWith("base64-")) {
      // Node.js Buffer available in middleware & server; atob as fallback
      value = typeof Buffer !== "undefined"
        ? Buffer.from(value.slice("base64-".length), "base64").toString("utf-8")
        : atob(value.slice("base64-".length));
    }
    const session = JSON.parse(value);
    return session.user ?? null;
  } catch {
    return null;
  }
}
