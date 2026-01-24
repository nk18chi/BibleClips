"use client";

import { useState } from "react";
import { z } from "zod";
import { useSupabase } from "@/components/providers/supabase-provider";

const commentContentSchema = z
  .string()
  .min(1, "Comment cannot be empty")
  .max(2000, "Comment must be 2000 characters or less");

type CommentFormProps = {
  clipId: string;
  onCommentAdded: () => void;
};

const SendIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <line x1="22" y1="2" x2="11" y2="13" />
    <polygon points="22 2 15 22 11 13 2 9 22 2" />
  </svg>
);

export function CommentForm({ clipId, onCommentAdded }: CommentFormProps) {
  const { supabase, user } = useSupabase();
  const [content, setContent] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!user || submitting) return;

    const result = commentContentSchema.safeParse(content);
    if (!result.success) {
      setError(result.error.errors[0]?.message ?? "Invalid comment");
      return;
    }

    setSubmitting(true);
    setError(null);

    const { error: insertError } = await supabase.from("comments").insert({
      clip_id: clipId,
      user_id: user.id,
      content: content.trim(),
    });

    if (insertError) {
      setError("Failed to post comment. Please try again.");
      setSubmitting(false);
      return;
    }

    setContent("");
    setSubmitting(false);
    onCommentAdded();
  };

  if (!user) {
    return (
      <div className="p-4 bg-gray-50 text-center text-sm text-gray-500">
        <a href="/login" className="text-blue-600 hover:underline">
          Sign in
        </a>{" "}
        to leave a comment
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="p-4 border-t border-gray-200 bg-white">
      {error && <p className="text-red-500 text-xs mb-2">{error}</p>}
      <div className="flex items-end gap-2">
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="Add a comment..."
          rows={1}
          maxLength={2000}
          className="flex-1 resize-none border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              handleSubmit(e);
            }
          }}
        />
        <button
          type="submit"
          disabled={!content.trim() || submitting}
          className="p-2 text-blue-600 hover:bg-blue-50 rounded-full disabled:opacity-50 disabled:hover:bg-transparent transition-colors"
        >
          <SendIcon />
        </button>
      </div>
      <p className="text-xs text-gray-400 mt-1 text-right">{content.length}/2000</p>
    </form>
  );
}
