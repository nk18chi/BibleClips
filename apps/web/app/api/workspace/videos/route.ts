import { createClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

function createAdminClient() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL ?? "", process.env.SUPABASE_SECRET_KEY ?? "");
}

// Workaround: Extract access token from cookie and create authenticated client
function getAuthFromCookie() {
  const cookieStore = cookies();
  const allCookies = cookieStore.getAll();

  // Find the auth token cookie (format: sb-<project-ref>-auth-token)
  const authCookie = allCookies.find((c) => c.name.includes("auth-token") && !c.name.includes("code-verifier"));

  if (!authCookie) {
    return null;
  }

  try {
    const session = JSON.parse(authCookie.value);
    return {
      accessToken: session.access_token,
      user: session.user,
    };
  } catch {
    return null;
  }
}

export async function GET(request: Request) {
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

  const { searchParams } = new URL(request.url);
  const channelId = searchParams.get("channelId");
  const status = searchParams.get("status") || "pending";

  let query = adminSupabase
    .from("work_queue_videos")
    .select("*, channel:youtube_channels(*)")
    .eq("status", status)
    .order("view_count", { ascending: false });

  if (channelId) {
    query = query.eq("channel_id", channelId);
  }

  const { data, error } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data || []);
}
