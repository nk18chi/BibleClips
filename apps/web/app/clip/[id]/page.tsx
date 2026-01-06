import { createServerClient } from '@/lib/supabase/server';
import { ReelViewer } from '@/components/reel/reel-viewer';
import { notFound } from 'next/navigation';

type Props = {
  params: { id: string };
};

type Clip = {
  id: string;
  title: string;
  youtube_video_id: string;
  start_time: number;
  end_time: number;
  vote_count: number;
  clip_verses: {
    book: string;
    book_ja: string;
    chapter: number;
    verse_start: number;
    verse_end: number | null;
  }[];
  clip_categories: {
    categories: {
      slug: string;
      name_en: string;
    } | null;
  }[];
};

async function getClip(id: string, userId?: string) {
  const supabase = createServerClient();

  const { data: clip } = await supabase
    .from('clips')
    .select(
      `
      id,
      title,
      youtube_video_id,
      start_time,
      end_time,
      vote_count,
      clip_verses (book, book_ja, chapter, verse_start, verse_end),
      clip_categories (categories (slug, name_en))
    `
    )
    .eq('id', id)
    .eq('status', 'APPROVED')
    .single();

  const typedClip = clip as Clip | null;

  if (!typedClip) return null;

  if (userId) {
    const { data: vote } = await supabase
      .from('votes')
      .select('clip_id')
      .eq('user_id', userId)
      .eq('clip_id', id)
      .single();

    return { ...typedClip, has_voted: !!vote };
  }

  return { ...typedClip, has_voted: false };
}

export default async function ClipPage({ params }: Props) {
  const supabase = createServerClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  const clip = await getClip(params.id, session?.user?.id);

  if (!clip) {
    notFound();
  }

  return <ReelViewer clips={[clip]} />;
}
