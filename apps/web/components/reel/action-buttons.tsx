"use client";

import { useState, useEffect } from "react";
import { useSupabase } from "@/components/providers/supabase-provider";

type ActionButtonsProps = {
  clipId: string;
  youtubeVideoId: string;
  voteCount: number;
  hasVoted: boolean;
  onVerseClick: () => void;
  onCommentClick: () => void;
  onStyleClick?: () => void;
};

// Simple SVG icons (Instagram-style outlines)
const HeartIcon = ({ filled }: { filled: boolean }) => (
  <svg
    width="28"
    height="28"
    viewBox="0 0 24 24"
    fill={filled ? "currentColor" : "none"}
    stroke="currentColor"
    strokeWidth="2"
  >
    <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
  </svg>
);

const ShareIcon = () => (
  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <line x1="22" y1="2" x2="11" y2="13" />
    <polygon points="22 2 15 22 11 13 2 9 22 2" />
  </svg>
);

const MoreIcon = () => (
  <svg width="28" height="28" viewBox="0 0 24 24" fill="currentColor">
    <circle cx="12" cy="12" r="1.5" />
    <circle cx="12" cy="6" r="1.5" />
    <circle cx="12" cy="18" r="1.5" />
  </svg>
);

const BookIcon = () => (
  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
    <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
  </svg>
);

const CommentIcon = () => (
  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
  </svg>
);

const StyleIcon = () => (
  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M12 2L2 7l10 5 10-5-10-5z" />
    <path d="M2 17l10 5 10-5" />
    <path d="M2 12l10 5 10-5" />
  </svg>
);

export function ActionButtons({
  clipId,
  youtubeVideoId,
  voteCount: initialVoteCount,
  hasVoted: initialHasVoted,
  onVerseClick,
  onCommentClick,
  onStyleClick,
}: ActionButtonsProps) {
  const { supabase, user } = useSupabase();
  const [voteCount, setVoteCount] = useState(initialVoteCount);
  const [hasVoted, setHasVoted] = useState(initialHasVoted);
  const [voting, setVoting] = useState(false);

  // Check if user has already voted on mount (server may not have this info)
  useEffect(() => {
    if (!user || initialHasVoted) return;
    supabase
      .from("votes")
      .select("clip_id")
      .eq("user_id", user.id)
      .eq("clip_id", clipId)
      .maybeSingle()
      .then(({ data }) => {
        if (data) {
          setHasVoted(true);
        }
      });
  }, [user, clipId, initialHasVoted, supabase]);

  const handleVote = async () => {
    if (!user || voting) return;

    setVoting(true);

    if (hasVoted) {
      // Remove vote
      const { error } = await supabase.from("votes").delete().eq("user_id", user.id).eq("clip_id", clipId);

      if (!error) {
        setVoteCount((v) => v - 1);
        setHasVoted(false);
      }
    } else {
      // Add vote
      const { error } = await supabase.from("votes").insert({ user_id: user.id, clip_id: clipId });

      if (!error) {
        setVoteCount((v) => v + 1);
        setHasVoted(true);
      } else if (error.code === "23505") {
        // Already voted (duplicate key) — just update UI state
        setHasVoted(true);
      }
    }

    setVoting(false);
  };

  const handleShare = async () => {
    const url = `${window.location.origin}/clip/${clipId}`;
    if (navigator.share) {
      await navigator.share({ url, title: "Check out this clip on BibleClips" });
    } else {
      await navigator.clipboard.writeText(url);
      alert("Link copied to clipboard!");
    }
  };

  return (
    <div className="flex flex-col items-center gap-5">
      {/* Like */}
      <button
        onClick={handleVote}
        disabled={!user || voting}
        className={`flex flex-col items-center gap-1 ${hasVoted ? "text-red-500" : "text-gray-700"} disabled:opacity-50 hover:scale-110 transition-transform`}
      >
        <HeartIcon filled={hasVoted} />
        <span className="text-sm font-medium">{voteCount > 0 ? voteCount : ""}</span>
      </button>

      {/* Comment */}
      <button
        onClick={onCommentClick}
        className="flex flex-col items-center text-gray-700 hover:scale-110 transition-transform"
      >
        <CommentIcon />
      </button>

      {/* Style */}
      {onStyleClick && (
        <button
          type="button"
          onClick={onStyleClick}
          className="flex flex-col items-center text-gray-700 hover:scale-110 transition-transform"
        >
          <StyleIcon />
        </button>
      )}

      {/* Share */}
      <button
        onClick={handleShare}
        className="flex flex-col items-center text-gray-700 hover:scale-110 transition-transform"
      >
        <ShareIcon />
      </button>

      {/* More (verse) */}
      <button
        onClick={onVerseClick}
        className="flex flex-col items-center text-gray-700 hover:scale-110 transition-transform"
      >
        <MoreIcon />
      </button>

      {/* Book/Verse thumbnail */}
      <a
        href={`https://www.youtube.com/watch?v=${youtubeVideoId}`}
        target="_blank"
        rel="noopener noreferrer"
        className="w-10 h-10 rounded-md bg-gray-200 flex items-center justify-center text-gray-700 hover:bg-gray-300 transition-colors overflow-hidden"
      >
        <BookIcon />
      </a>
    </div>
  );
}
