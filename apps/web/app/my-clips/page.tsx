import Link from "next/link";
import { redirect } from "next/navigation";
import { Header } from "@/components/ui/header";
import { createServerClient, getSessionFromCookie } from "@/lib/supabase/server";

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

async function getUserSubmittedClips(userId: string): Promise<Clip[]> {
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

async function getUserLikedClips(userId: string): Promise<Clip[]> {
  const supabase = createServerClient();

  const { data } = await supabase
    .from("votes")
    .select(`
      clip_id,
      clips (
        id,
        title,
        youtube_video_id,
        status,
        vote_count,
        created_at,
        clip_verses (book, chapter, verse_start, verse_end)
      )
    `)
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  // Extract clips from the joined result (clips is a single object, not array)
  const clips: Clip[] = [];
  for (const item of data || []) {
    const clip = item.clips as unknown as Clip | null;
    if (clip) {
      clips.push(clip);
    }
  }
  return clips;
}

async function getUserCommentedClips(userId: string): Promise<Clip[]> {
  const supabase = createServerClient();

  // Get distinct clip_ids from comments
  const { data } = await supabase
    .from("comments")
    .select(`
      clip_id,
      clips (
        id,
        title,
        youtube_video_id,
        status,
        vote_count,
        created_at,
        clip_verses (book, chapter, verse_start, verse_end)
      )
    `)
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  // Deduplicate clips (user may have multiple comments on same clip)
  const seen = new Set<string>();
  const clips: Clip[] = [];
  for (const item of data || []) {
    const clip = item.clips as unknown as Clip | null;
    if (clip && !seen.has(clip.id)) {
      seen.add(clip.id);
      clips.push(clip);
    }
  }

  return clips;
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

function ClipCard({ clip, showStatus = true }: { clip: Clip; showStatus?: boolean }) {
  return (
    <div className="flex gap-4 p-4 bg-white border border-gray-200 rounded-lg">
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
          {showStatus && getStatusBadge(clip.status)}
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
  );
}

type Tab = "submitted" | "liked" | "commented";

export default async function MyClipsPage({
  searchParams,
}: {
  searchParams: { submitted?: string; tab?: Tab };
}) {
  const session = getSessionFromCookie();

  if (!session) {
    redirect("/login?redirectTo=/my-clips");
  }

  const currentTab = searchParams.tab || "submitted";
  const justSubmitted = searchParams.submitted === "true";

  // Fetch data based on current tab
  const [submittedClips, likedClips, commentedClips] = await Promise.all([
    getUserSubmittedClips(session.user.id),
    currentTab === "liked" ? getUserLikedClips(session.user.id) : Promise.resolve([]),
    currentTab === "commented" ? getUserCommentedClips(session.user.id) : Promise.resolve([]),
  ]);

  const clips =
    currentTab === "submitted"
      ? submittedClips
      : currentTab === "liked"
        ? likedClips
        : commentedClips;

  const tabs = [
    { id: "submitted" as Tab, label: "Submitted", count: submittedClips.length },
    { id: "liked" as Tab, label: "Liked" },
    { id: "commented" as Tab, label: "Commented" },
  ];

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

        {/* Tabs */}
        <div className="flex gap-1 mb-6 border-b">
          {tabs.map((tab) => (
            <Link
              key={tab.id}
              href={`/my-clips?tab=${tab.id}`}
              className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
                currentTab === tab.id
                  ? "border-blue-600 text-blue-600"
                  : "border-transparent text-gray-500 hover:text-gray-700"
              }`}
            >
              {tab.label}
              {tab.count !== undefined && (
                <span className="ml-1 text-xs text-gray-400">({tab.count})</span>
              )}
            </Link>
          ))}
        </div>

        {clips.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-500 mb-4">
              {currentTab === "submitted" && "You haven't submitted any clips yet."}
              {currentTab === "liked" && "You haven't liked any clips yet."}
              {currentTab === "commented" && "You haven't commented on any clips yet."}
            </p>
            {currentTab === "submitted" && (
              <Link
                href="/submit"
                className="inline-block bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700"
              >
                Submit Your First Clip
              </Link>
            )}
            {(currentTab === "liked" || currentTab === "commented") && (
              <Link
                href="/"
                className="inline-block bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700"
              >
                Discover Clips
              </Link>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            {clips.map((clip) => (
              <ClipCard
                key={clip.id}
                clip={clip}
                showStatus={currentTab === "submitted"}
              />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
