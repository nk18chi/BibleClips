import { createClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { parseUserFromAuthCookies } from "@/lib/supabase/parse-auth-cookie";

function createAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL ?? "",
    process.env.SUPABASE_SECRET_KEY ?? ""
  );
}

function getAuthFromCookie() {
  const cookieStore = cookies();
  const user = parseUserFromAuthCookies(cookieStore.getAll());
  return user ? { user } : null;
}

export async function GET() {
  // Workaround for Supabase SSR bug - manually extract auth from cookie
  const auth = getAuthFromCookie();

  if (!auth) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const adminSupabase = createAdminClient();

  // Check role using admin client
  const { data: profile } = await adminSupabase
    .from("users")
    .select("role")
    .eq("id", auth.user.id)
    .single();

  const role = profile?.role || "USER";
  if (role !== "ADMIN" && role !== "CONTRIBUTOR") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { data, error } = await adminSupabase
    .from("youtube_channels")
    .select("*")
    .eq("is_active", true)
    .order("channel_name");

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data || []);
}
