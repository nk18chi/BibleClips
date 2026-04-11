import { redirect } from "next/navigation";
import { Header } from "@/components/ui/header";
import { createServerClient, getSessionFromCookie } from "@/lib/supabase/server";
import { PendingReview } from "./pending-review";

type PendingClip = {
  id: string;
  title: string;
  youtube_video_id: string;
  start_time: number;
  end_time: number;
  clip_type: "sermon" | "song" | "testimony";
  created_at: string;
  clip_verses: {
    book: string;
    chapter: number;
    verse_start: number;
    verse_end: number | null;
  }[];
  clip_songs: {
    artist_name: string;
    song_name: string;
  }[];
  clip_categories: {
    category_id: string;
  }[];
};

type VideoGroup = {
  youtube_video_id: string;
  title: string;
  clips: PendingClip[];
};

async function getPendingGroups(): Promise<VideoGroup[]> {
  const supabase = createServerClient();

  const { data } = await supabase
    .from("clips")
    .select(`
      id,
      title,
      youtube_video_id,
      start_time,
      end_time,
      clip_type,
      created_at,
      clip_songs (artist_name, song_name),
      clip_verses (book, chapter, verse_start, verse_end),
      clip_categories (category_id)
    `)
    .eq("status", "PENDING")
    .order("start_time", { ascending: true });

  if (!data || data.length === 0) return [];

  // Group by video
  const map = new Map<string, VideoGroup>();
  for (const clip of data as PendingClip[]) {
    let group = map.get(clip.youtube_video_id);
    if (!group) {
      group = { youtube_video_id: clip.youtube_video_id, title: clip.title, clips: [] };
      map.set(clip.youtube_video_id, group);
    }
    group.clips.push(clip);
  }

  // Fetch video titles from work_queue_videos
  const videoIds = [...map.keys()];
  const { data: videos } = await supabase
    .from("work_queue_videos")
    .select("youtube_video_id, title")
    .in("youtube_video_id", videoIds);

  if (videos) {
    for (const v of videos) {
      const group = map.get(v.youtube_video_id);
      if (group) group.title = v.title;
    }
  }

  return [...map.values()];
}

async function getCategories() {
  const supabase = createServerClient();
  const { data } = await supabase
    .from("categories")
    .select("id, slug, name_en")
    .order("name_en");
  return data || [];
}

async function isAdmin(userId: string): Promise<boolean> {
  const supabase = createServerClient();
  const { data } = await supabase.from("users").select("role").eq("id", userId).single();
  return data?.role === "ADMIN";
}

function formatClipRef(clip: PendingClip): string {
  if (clip.clip_type === "testimony") {
    return "Testimony";
  }
  if (clip.clip_type === "song" && clip.clip_songs?.length > 0) {
    const song = clip.clip_songs[0];
    if (!song) return "No song";
    return `${song.artist_name} - ${song.song_name}`;
  }
  const verses = clip.clip_verses;
  if (!verses || verses.length === 0) return "No verse";
  const v = verses[0];
  if (!v) return "No verse";
  const verseRange = v.verse_end ? `${v.verse_start}-${v.verse_end}` : `${v.verse_start}`;
  return `${v.book} ${v.chapter}:${verseRange}`;
}

function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.round(seconds % 60);
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

  const [groups, categories] = await Promise.all([
    getPendingGroups(),
    getCategories(),
  ]);
  const totalClips = groups.reduce((sum, g) => sum + g.clips.length, 0);

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />

      <main className="max-w-7xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Pending Clips</h1>
          <span className="bg-yellow-100 text-yellow-800 px-3 py-1 rounded-full text-sm">
            {totalClips} pending across {groups.length} video{groups.length !== 1 ? "s" : ""}
          </span>
        </div>

        <PendingReview groups={groups} categories={categories} />
      </main>
    </div>
  );
}
