"use client";

import { formatDistanceToNow } from "date-fns";
import { useState } from "react";
import { useSupabase } from "@/components/providers/supabase-provider";

type CommentCardProps = {
  id: string;
  content: string;
  authorName: string | null;
  authorId: string;
  likeCount: number;
  hasLiked: boolean;
  createdAt: string;
  onDelete?: () => void;
  onReport?: () => void;
};

const HeartIcon = ({ filled }: { filled: boolean }) => (
  <svg
    width="16"
    height="16"
    viewBox="0 0 24 24"
    fill={filled ? "currentColor" : "none"}
    stroke="currentColor"
    strokeWidth="2"
    aria-hidden="true"
  >
    <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
  </svg>
);

const FlagIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
    <path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z" />
    <line x1="4" y1="22" x2="4" y2="15" />
  </svg>
);

const TrashIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
    <polyline points="3 6 5 6 21 6" />
    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
  </svg>
);

export function CommentCard({
  id,
  content,
  authorName,
  authorId,
  likeCount: initialLikeCount,
  hasLiked: initialHasLiked,
  createdAt,
  onDelete,
  onReport,
}: CommentCardProps) {
  const { supabase, user } = useSupabase();
  const [likeCount, setLikeCount] = useState(initialLikeCount);
  const [hasLiked, setHasLiked] = useState(initialHasLiked);
  const [liking, setLiking] = useState(false);

  const isOwner = user?.id === authorId;
  const displayName = authorName || "Anonymous";
  const timeAgo = formatDistanceToNow(new Date(createdAt), { addSuffix: true });

  const handleLike = async () => {
    if (!user || liking) return;

    setLiking(true);

    if (hasLiked) {
      const { error } = await supabase.from("comment_likes").delete().eq("comment_id", id).eq("user_id", user.id);

      if (!error) {
        setLikeCount((c) => c - 1);
        setHasLiked(false);
      }
    } else {
      const { error } = await supabase.from("comment_likes").insert({ comment_id: id, user_id: user.id });

      if (!error) {
        setLikeCount((c) => c + 1);
        setHasLiked(true);
      }
    }

    setLiking(false);
  };

  return (
    <div className="py-3 border-b border-gray-100 last:border-b-0">
      <div className="flex justify-between items-start gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-medium text-sm text-gray-900 truncate">{displayName}</span>
            <span className="text-xs text-gray-400">{timeAgo}</span>
          </div>
          <p className="text-sm text-gray-700 mt-1 whitespace-pre-wrap break-words">{content}</p>
        </div>
      </div>

      <div className="flex items-center gap-4 mt-2">
        <button
          type="button"
          onClick={handleLike}
          disabled={!user || liking}
          className={`flex items-center gap-1 text-xs ${hasLiked ? "text-red-500" : "text-gray-400"} hover:text-red-500 disabled:opacity-50 transition-colors`}
        >
          <HeartIcon filled={hasLiked} />
          {likeCount > 0 && <span>{likeCount}</span>}
        </button>

        {!isOwner && user && (
          <button
            type="button"
            onClick={onReport}
            className="flex items-center gap-1 text-xs text-gray-400 hover:text-orange-500 transition-colors"
          >
            <FlagIcon />
            <span>Report</span>
          </button>
        )}

        {isOwner && (
          <button
            type="button"
            onClick={onDelete}
            className="flex items-center gap-1 text-xs text-gray-400 hover:text-red-500 transition-colors"
          >
            <TrashIcon />
            <span>Delete</span>
          </button>
        )}
      </div>
    </div>
  );
}
