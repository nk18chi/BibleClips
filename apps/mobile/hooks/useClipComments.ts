import { useState, useEffect, useCallback } from "react";
import type { CommentWithUser } from "@bibleclips/database";
import { supabase } from "@/lib/supabase";
import { useSupabase } from "./useSupabase";

export function useClipComments(clipId: string) {
  const { user } = useSupabase();
  const [comments, setComments] = useState<CommentWithUser[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchComments = useCallback(async () => {
    const { data } = await supabase
      .from("comments")
      .select("*, user:users(id, display_name)")
      .eq("clip_id", clipId)
      .order("created_at", { ascending: false });
    setComments((data ?? []) as CommentWithUser[]);
    setLoading(false);
  }, [clipId]);

  useEffect(() => { fetchComments(); }, [fetchComments]);

  const addComment = useCallback(
    async (content: string) => {
      if (!user) return;
      await supabase.from("comments").insert({ clip_id: clipId, user_id: user.id, content });
      fetchComments();
    },
    [user, clipId, fetchComments]
  );

  return { comments, loading, addComment };
}
