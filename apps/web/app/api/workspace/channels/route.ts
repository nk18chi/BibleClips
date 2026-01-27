import { createClient } from "@supabase/supabase-js";
import { createServerClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

function createAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL ?? "",
    process.env.SUPABASE_SECRET_KEY ?? ""
  );
}

export async function GET() {
  const supabase = createServerClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Check role
  const { data: profile } = await supabase
    .from("users")
    .select("role")
    .eq("id", user.id)
    .single();

  const role = profile?.role || "USER";
  if (role !== "ADMIN" && role !== "CONTRIBUTOR") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const adminSupabase = createAdminClient();
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
