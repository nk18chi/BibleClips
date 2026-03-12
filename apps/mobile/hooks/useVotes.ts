import { useState, useCallback, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { useSupabase } from "./useSupabase";

export function useVotes() {
  const { user } = useSupabase();
  const [votedClipIds, setVotedClipIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!user) return;
    supabase
      .from("votes")
      .select("clip_id")
      .eq("user_id", user.id)
      .then(({ data }) => {
        if (data) setVotedClipIds(new Set(data.map((v) => v.clip_id)));
      });
  }, [user?.id]);

  const toggleVote = useCallback(
    async (clipId: string) => {
      if (!user) return;
      const hasVoted = votedClipIds.has(clipId);

      if (hasVoted) {
        await supabase.from("votes").delete().eq("clip_id", clipId).eq("user_id", user.id);
        setVotedClipIds((prev) => {
          const next = new Set(prev);
          next.delete(clipId);
          return next;
        });
      } else {
        await supabase.from("votes").insert({ clip_id: clipId, user_id: user.id });
        setVotedClipIds((prev) => new Set(prev).add(clipId));
      }
    },
    [user, votedClipIds]
  );

  return { votedClipIds, toggleVote };
}
