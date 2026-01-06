'use client';

import { useState } from 'react';
import { useSupabase } from '@/components/providers/supabase-provider';

type ActionButtonsProps = {
  clipId: string;
  youtubeVideoId: string;
  voteCount: number;
  hasVoted: boolean;
  onVerseClick: () => void;
};

export function ActionButtons({
  clipId,
  youtubeVideoId,
  voteCount: initialVoteCount,
  hasVoted: initialHasVoted,
  onVerseClick,
}: ActionButtonsProps) {
  const { supabase, user } = useSupabase();
  const [voteCount, setVoteCount] = useState(initialVoteCount);
  const [hasVoted, setHasVoted] = useState(initialHasVoted);
  const [voting, setVoting] = useState(false);

  const handleVote = async () => {
    if (!user || voting) return;

    setVoting(true);

    if (hasVoted) {
      // Remove vote
      const { error } = await supabase
        .from('votes')
        .delete()
        .eq('user_id', user.id)
        .eq('clip_id', clipId);

      if (!error) {
        setVoteCount((v) => v - 1);
        setHasVoted(false);
      }
    } else {
      // Add vote
      const { error } = await supabase
        .from('votes')
        .insert({ user_id: user.id, clip_id: clipId });

      if (!error) {
        setVoteCount((v) => v + 1);
        setHasVoted(true);
      }
    }

    setVoting(false);
  };

  const handleShare = async () => {
    const url = `${window.location.origin}/clip/${clipId}`;
    if (navigator.share) {
      await navigator.share({ url, title: 'Check out this clip on BibleClips' });
    } else {
      await navigator.clipboard.writeText(url);
      alert('Link copied to clipboard!');
    }
  };

  return (
    <div className="flex flex-col gap-4">
      {/* Vote */}
      <button
        onClick={handleVote}
        disabled={!user || voting}
        className={`flex flex-col items-center ${hasVoted ? 'text-red-500' : 'text-white'} disabled:opacity-50`}
      >
        <span className="text-2xl">{hasVoted ? '\u2764\uFE0F' : '\u{1F90D}'}</span>
        <span className="text-xs">{voteCount}</span>
      </button>

      {/* Verse */}
      <button onClick={onVerseClick} className="flex flex-col items-center text-white">
        <span className="text-2xl">{'\u{1F4D6}'}</span>
        <span className="text-xs">Verse</span>
      </button>

      {/* Share */}
      <button onClick={handleShare} className="flex flex-col items-center text-white">
        <span className="text-2xl">{'\u{1F4E4}'}</span>
        <span className="text-xs">Share</span>
      </button>

      {/* Full Video */}
      <a
        href={`https://www.youtube.com/watch?v=${youtubeVideoId}`}
        target="_blank"
        rel="noopener noreferrer"
        className="flex flex-col items-center text-white"
      >
        <span className="text-2xl">{'\u25B6\uFE0F'}</span>
        <span className="text-xs">Full</span>
      </a>
    </div>
  );
}
