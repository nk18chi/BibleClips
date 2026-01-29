"use client";

import { useCallback, useEffect, useState } from "react";
import { useSupabase } from "@/components/providers/supabase-provider";
import { CommentCard } from "./comment-card";
import { CommentForm } from "./comment-form";
import { ReportModal } from "./report-modal";

type CommentWithUser = {
  id: string;
  clip_id: string;
  user_id: string;
  content: string;
  like_count: number;
  created_at: string;
  updated_at: string;
  user: { id: string; display_name: string | null } | null;
};

type CommentSectionProps = {
  clipId: string;
  onClose: () => void;
};

export function CommentSection({ clipId, onClose }: CommentSectionProps) {
  const { supabase, user } = useSupabase();
  const [comments, setComments] = useState<CommentWithUser[]>([]);
  const [userLikes, setUserLikes] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [reportingCommentId, setReportingCommentId] = useState<string | null>(null);

  const fetchComments = useCallback(async () => {
    setLoading(true);

    // Fetch comments
    const { data: commentsData, error } = await supabase
      .from("comments")
      .select("id, clip_id, user_id, content, like_count, created_at, updated_at")
      .eq("clip_id", clipId)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Failed to fetch comments:", error);
      setLoading(false);
      return;
    }

    if (commentsData && commentsData.length > 0) {
      // Fetch user display names separately
      const userIds = [...new Set(commentsData.map((c) => c.user_id))];
      const { data: usersData } = await supabase.from("users").select("id, display_name").in("id", userIds);

      const userMap = new Map(usersData?.map((u) => [u.id, u.display_name]) ?? []);

      const transformed: CommentWithUser[] = commentsData.map((c) => ({
        ...c,
        user: { id: c.user_id, display_name: userMap.get(c.user_id) ?? null },
      }));
      setComments(transformed);
    } else {
      setComments([]);
    }

    if (user && commentsData && commentsData.length > 0) {
      const commentIds = commentsData.map((c) => c.id);
      const { data: likesData } = await supabase.from("comment_likes").select("comment_id").eq("user_id", user.id).in("comment_id", commentIds);

      if (likesData) {
        setUserLikes(new Set(likesData.map((l) => l.comment_id)));
      }
    } else {
      setUserLikes(new Set());
    }

    setLoading(false);
  }, [supabase, clipId, user]);

  useEffect(() => {
    fetchComments();
  }, [fetchComments]);

  const handleDelete = async (commentId: string) => {
    if (!user) return;

    const confirmed = window.confirm("Are you sure you want to delete this comment?");
    if (!confirmed) return;

    const { error } = await supabase.from("comments").delete().eq("id", commentId).eq("user_id", user.id);

    if (!error) {
      setComments((prev) => prev.filter((c) => c.id !== commentId));
    }
  };

  return (
    <div className='fixed inset-0 z-40 flex flex-col bg-black/50' onClick={onClose}>
      <div className='flex-1' />
      <div className='bg-white rounded-t-2xl max-h-[95vh] min-h-[60vh] w-full flex flex-col animate-slide-up' onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className='flex items-center justify-between p-4 border-b border-gray-200'>
          <h2 className='text-lg font-semibold'>Comments {comments.length > 0 && `(${comments.length})`}</h2>
          <button onClick={onClose} className='p-1 text-gray-400 hover:text-gray-600 transition-colors'>
            <svg width='24' height='24' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2'>
              <line x1='18' y1='6' x2='6' y2='18' />
              <line x1='6' y1='6' x2='18' y2='18' />
            </svg>
          </button>
        </div>

        {/* Comments list */}
        <div className='flex-1 overflow-y-auto px-4'>
          {loading ? (
            <div className='py-8 text-center text-gray-400'>Loading...</div>
          ) : comments.length === 0 ? (
            <div className='py-8 text-center text-gray-400'>No comments yet. Be the first to comment!</div>
          ) : (
            comments.map((comment) => (
              <CommentCard
                key={comment.id}
                id={comment.id}
                content={comment.content}
                authorName={comment.user?.display_name ?? null}
                authorId={comment.user_id}
                likeCount={comment.like_count}
                hasLiked={userLikes.has(comment.id)}
                createdAt={comment.created_at}
                onDelete={() => handleDelete(comment.id)}
                onReport={() => setReportingCommentId(comment.id)}
              />
            ))
          )}
        </div>

        {/* Comment form */}
        <CommentForm clipId={clipId} onCommentAdded={fetchComments} />
      </div>

      {/* Report modal */}
      {reportingCommentId && (
        <ReportModal
          commentId={reportingCommentId}
          onClose={() => setReportingCommentId(null)}
          onReported={() => {
            alert("Report submitted. Thank you for helping keep our community safe.");
          }}
        />
      )}

      <style jsx>{`
        @keyframes slide-up {
          from {
            transform: translateY(100%);
          }
          to {
            transform: translateY(0);
          }
        }
        .animate-slide-up {
          animation: slide-up 0.3s ease-out;
        }
      `}</style>
    </div>
  );
}
