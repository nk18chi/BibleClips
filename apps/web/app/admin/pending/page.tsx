import { redirect } from "next/navigation";
import { Header } from "@/components/ui/header";
import { createServerClient, getSessionFromCookie } from "@/lib/supabase/server";
import { AdminClipActions } from "./admin-clip-actions";

type PendingClip = {
  id: string;
  title: string;
  youtube_video_id: string;
  start_time: number;
  end_time: number;
  status: string;
  created_at: string;
  submitted_by: string;
  users: {
    display_name: string | null;
  }[];
  clip_verses: {
    book: string;
    chapter: number;
    verse_start: number;
    verse_end: number | null;
  }[];
  clip_categories: {
    categories: {
      name_en: string;
    }[];
  }[];
};

async function getPendingClips(): Promise<PendingClip[]> {
  const supabase = createServerClient();

  const { data } = await supabase
    .from("clips")
    .select(`
      id,
      title,
      youtube_video_id,
      start_time,
      end_time,
      status,
      created_at,
      submitted_by,
      users!submitted_by (display_name),
      clip_verses (book, chapter, verse_start, verse_end),
      clip_categories (categories (name_en))
    `)
    .eq("status", "PENDING")
    .order("created_at", { ascending: true });

  return (data as PendingClip[]) || [];
}

async function isAdmin(userId: string): Promise<boolean> {
  const supabase = createServerClient();
  const { data } = await supabase.from("users").select("role").eq("id", userId).single();

  return data?.role === "ADMIN";
}

function formatVerseRef(verses: PendingClip["clip_verses"]): string {
  if (!verses || verses.length === 0) return "No verse";
  const v = verses[0];
  if (!v) return "No verse";
  const verseRange = v.verse_end ? `${v.verse_start}-${v.verse_end}` : `${v.verse_start}`;
  return `${v.book} ${v.chapter}:${verseRange}`;
}

function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}

export default async function AdminPendingPage() {
  const session = getSessionFromCookie();

  if (!session) {
    redirect("/login?redirectTo=/admin/pending");
  }

  const admin = await isAdmin(session.user.id);
  if (!admin) {
    redirect("/");
  }

  const clips = await getPendingClips();

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />

      <main className="max-w-6xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Pending Clips</h1>
          <span className="bg-yellow-100 text-yellow-800 px-3 py-1 rounded-full text-sm">{clips.length} pending</span>
        </div>

        {clips.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-lg border">
            <p className="text-gray-500">No pending clips to review.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {clips.map((clip) => (
              <div key={clip.id} className="bg-white border border-gray-200 rounded-lg p-4">
                <div className="flex gap-4">
                  <div className="flex-shrink-0">
                    <img
                      src={`https://img.youtube.com/vi/${clip.youtube_video_id}/mqdefault.jpg`}
                      alt={clip.title}
                      className="w-48 h-28 object-cover rounded"
                    />
                    <div className="mt-2 text-xs text-gray-500 text-center">
                      {formatTime(clip.start_time)} - {formatTime(clip.end_time)}
                    </div>
                  </div>

                  <div className="flex-1">
                    <h3 className="font-semibold text-gray-900">{clip.title}</h3>
                    <p className="text-sm text-gray-600 mt-1">{formatVerseRef(clip.clip_verses)}</p>

                    <div className="flex flex-wrap gap-1 mt-2">
                      {clip.clip_categories?.map(
                        (cc) =>
                          cc.categories?.[0] && (
                            <span
                              key={cc.categories[0].name_en}
                              className="px-2 py-0.5 bg-gray-100 text-gray-600 text-xs rounded"
                            >
                              {cc.categories[0].name_en}
                            </span>
                          )
                      )}
                    </div>

                    <div className="mt-3 text-xs text-gray-500">
                      Submitted by: {clip.users?.[0]?.display_name || "Unknown"} •{" "}
                      {new Date(clip.created_at).toLocaleDateString()}
                    </div>

                    <div className="mt-3 flex gap-2">
                      <a
                        href={`https://www.youtube.com/watch?v=${clip.youtube_video_id}&t=${clip.start_time}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm text-blue-600 hover:text-blue-800"
                      >
                        Preview on YouTube ↗
                      </a>
                    </div>
                  </div>

                  <div className="flex-shrink-0">
                    <AdminClipActions clipId={clip.id} />
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
