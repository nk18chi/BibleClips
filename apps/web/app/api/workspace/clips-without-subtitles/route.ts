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

export async function GET() {
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

  // Count clips without subtitles
  // First get all approved clips
  const { data: clips, error } = await adminSupabase
    .from("clips")
    .select("id")
    .eq("status", "APPROVED");

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (!clips || clips.length === 0) {
    return NextResponse.json({ count: 0 });
  }

  // Check which ones have subtitles
  let countWithoutSubtitles = 0;
  for (const clip of clips) {
    const { count } = await adminSupabase
      .from("clip_subtitles")
      .select("*", { count: "exact", head: true })
      .eq("clip_id", clip.id);

    if (!count || count === 0) {
      countWithoutSubtitles++;
    }
  }

  return NextResponse.json({ count: countWithoutSubtitles });
}
