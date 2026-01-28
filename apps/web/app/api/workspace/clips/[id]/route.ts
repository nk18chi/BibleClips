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

export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  const auth = getAuthFromCookie();

  if (!auth) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const clipId = params.id;

  if (!clipId) {
    return NextResponse.json({ error: "clipId required" }, { status: 400 });
  }

  const adminSupabase = createAdminClient();

  // Get clip to find youtube_video_id
  const { data: clip } = await adminSupabase
    .from("clips")
    .select("youtube_video_id")
    .eq("id", clipId)
    .single();

  // Delete clip (cascades to verses, categories, subtitles)
  const { error } = await adminSupabase
    .from("clips")
    .delete()
    .eq("id", clipId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Decrement clips_created in background (don't await)
  if (clip) {
    adminSupabase.rpc("decrement_clips_created", { video_id: clip.youtube_video_id }).then(({ error: rpcError }) => {
      if (rpcError) console.error("Failed to decrement clips_created:", rpcError);
    });
  }

  return NextResponse.json({ success: true });
}
