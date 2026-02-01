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

export async function GET(request: Request) {
  const auth = getAuthFromCookie();

  if (!auth) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Skip role check for reading clips - auth is enough
  const adminSupabase = createAdminClient();
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
      subtitle_style,
      created_at,
      clip_type,
      clip_songs (
        artist_name,
        song_name
      ),
      clip_verses (
        book,
        book_ja,
        chapter,
        verse_start,
        verse_end,
        version
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
