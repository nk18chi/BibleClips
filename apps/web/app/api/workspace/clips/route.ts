import { createClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

function createAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL ?? "",
    process.env.SUPABASE_SECRET_KEY ?? ""
  );
}

function getAuthFromCookie() {
  const cookieStore = cookies();
  const allCookies = cookieStore.getAll();
  const authCookie = allCookies.find((c) => c.name.includes("auth-token") && !c.name.includes("code-verifier"));

  if (!authCookie) return null;

  try {
    const session = JSON.parse(authCookie.value);
    return { user: session.user };
  } catch {
    return null;
  }
}

export async function GET(request: Request) {
  const auth = getAuthFromCookie();

  if (!auth) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const adminSupabase = createAdminClient();

  // Check role
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
  const videoId = searchParams.get("videoId");

  if (!videoId) {
    return NextResponse.json({ error: "videoId required" }, { status: 400 });
  }

  const { data, error } = await adminSupabase
    .from("clips")
    .select(`
      id,
      youtube_video_id,
      start_time,
      end_time,
      title,
      status,
      created_at,
      clip_verses (
        book,
        book_ja,
        chapter,
        verse_start,
        verse_end
      ),
      clip_categories (
        category_id
      ),
      clip_subtitles (count)
    `)
    .eq("youtube_video_id", videoId)
    .order("start_time");

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data || []);
}
