import { createServerClient } from '@/lib/supabase/server';
import { ReelViewer } from '@/components/reel/reel-viewer';
import { notFound } from 'next/navigation';

type Props = {
  params: { id: string };
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

  if (!clip) return null;

  if (userId) {
    const { data: vote } = await supabase
      .from('votes')
      .select('clip_id')
      .eq('user_id', userId)
      .eq('clip_id', id)
      .single();

    return { ...clip, has_voted: !!vote };
  }

  return { ...clip, has_voted: false };
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
