import Link from "next/link";
import { redirect } from "next/navigation";
import { Header } from "@/components/ui/header";
import { createServerClient } from "@/lib/supabase/server";

type Clip = {
  id: string;
  title: string;
  youtube_video_id: string;
  status: "PENDING" | "APPROVED" | "REJECTED";
  vote_count: number;
  created_at: string;
  clip_verses: {
    book: string;
    chapter: number;
    verse_start: number;
    verse_end: number | null;
  }[];
};

async function getUserClips(userId: string): Promise<Clip[]> {
  const supabase = createServerClient();

  const { data } = await supabase
    .from("clips")
    .select(`
      id,
      title,
      youtube_video_id,
      status,
      vote_count,
      created_at,
      clip_verses (book, chapter, verse_start, verse_end)
    `)
    .eq("submitted_by", userId)
    .order("created_at", { ascending: false });

  return (data as Clip[]) || [];
}

function formatVerseRef(verses: Clip["clip_verses"]): string {
  if (!verses || verses.length === 0) return "";
  const v = verses[0];
  if (!v || !v.book || v.chapter === undefined || v.verse_start === undefined) return "";
  const verseRange = v.verse_end ? `${v.verse_start}-${v.verse_end}` : `${v.verse_start}`;
  return `${v.book} ${v.chapter}:${verseRange}`;
}

function getStatusBadge(status: Clip["status"]) {
  switch (status) {
    case "PENDING":
      return <span className="px-2 py-1 text-xs bg-yellow-100 text-yellow-800 rounded-full">Pending</span>;
    case "APPROVED":
      return <span className="px-2 py-1 text-xs bg-green-100 text-green-800 rounded-full">Approved</span>;
    case "REJECTED":
      return <span className="px-2 py-1 text-xs bg-red-100 text-red-800 rounded-full">Rejected</span>;
  }
}

export default async function MyClipsPage({ searchParams }: { searchParams: { submitted?: string } }) {
  const supabase = createServerClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) {
    redirect("/login?redirectTo=/my-clips");
  }

  const clips = await getUserClips(session.user.id);
  const justSubmitted = searchParams.submitted === "true";

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />

      <main className="max-w-4xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-gray-900">My Clips</h1>
          <Link href="/submit" className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700">
            Submit New Clip
          </Link>
        </div>

        {justSubmitted && (
          <div className="mb-6 bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded">
            Your clip has been submitted successfully! It will be visible once approved by an admin.
          </div>
        )}

        {clips.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-500 mb-4">You haven&apos;t submitted any clips yet.</p>
            <Link href="/submit" className="inline-block bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700">
              Submit Your First Clip
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {clips.map((clip) => (
              <div key={clip.id} className="flex gap-4 p-4 bg-white border border-gray-200 rounded-lg">
                <img
                  src={`https://img.youtube.com/vi/${clip.youtube_video_id}/mqdefault.jpg`}
                  alt={clip.title}
                  className="w-40 h-24 object-cover rounded"
                />
                <div className="flex-1">
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="font-medium text-gray-900">{clip.title}</h3>
                      <p className="text-sm text-gray-500">{formatVerseRef(clip.clip_verses)}</p>
                    </div>
                    {getStatusBadge(clip.status)}
                  </div>
                  <div className="mt-2 flex items-center gap-4 text-sm text-gray-500">
                    <span>{clip.vote_count} votes</span>
                    <span>{new Date(clip.created_at).toLocaleDateString()}</span>
                  </div>
                  {clip.status === "APPROVED" && (
                    <Link
                      href={`/clip/${clip.id}`}
                      className="mt-2 inline-block text-sm text-blue-600 hover:text-blue-800"
                    >
                      View clip
                    </Link>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
