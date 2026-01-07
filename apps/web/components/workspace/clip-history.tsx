'use client';

import { useState } from 'react';
import { deleteClip } from '@/app/workspace/actions';
import type { ClipWithVerse } from '@/types/workspace';

type ClipHistoryProps = {
  clips: ClipWithVerse[];
  onDeleted: () => void;
};

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export function ClipHistory({ clips, onDeleted }: ClipHistoryProps) {
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [confirmId, setConfirmId] = useState<string | null>(null);

  const handleDelete = async (clipId: string) => {
    setDeletingId(clipId);
    try {
      await deleteClip(clipId);
      onDeleted();
    } catch (err) {
      console.error('Failed to delete clip:', err);
    } finally {
      setDeletingId(null);
      setConfirmId(null);
    }
  };

  if (clips.length === 0) {
    return (
      <div className="p-4 bg-gray-50 rounded-lg">
        <h3 className="font-semibold text-gray-900 mb-2">Clips from this video</h3>
        <p className="text-sm text-gray-500">No clips created yet</p>
      </div>
    );
  }

  return (
    <div className="p-4 bg-gray-50 rounded-lg">
      <h3 className="font-semibold text-gray-900 mb-3">
        Clips from this video ({clips.length})
      </h3>
      <div className="space-y-2">
        {clips.map((clip) => {
          const verse = clip.clip_verses[0];
          const verseRef = verse
            ? `${verse.book} ${verse.chapter}:${verse.verse_start}${verse.verse_end ? `-${verse.verse_end}` : ''}`
            : clip.title;

          return (
            <div
              key={clip.id}
              className="flex items-center justify-between bg-white p-2 rounded border"
            >
              <div className="text-sm">
                <span className="font-medium">{verseRef}</span>
                <span className="text-gray-500 ml-2">
                  ({formatTime(clip.start_time)} - {formatTime(clip.end_time)})
                </span>
              </div>

              {confirmId === clip.id ? (
                <div className="flex gap-1">
                  <button
                    onClick={() => handleDelete(clip.id)}
                    disabled={deletingId === clip.id}
                    className="px-2 py-1 bg-red-600 text-white text-xs rounded hover:bg-red-700 disabled:opacity-50"
                  >
                    {deletingId === clip.id ? '...' : 'Yes'}
                  </button>
                  <button
                    onClick={() => setConfirmId(null)}
                    className="px-2 py-1 bg-gray-200 text-gray-700 text-xs rounded hover:bg-gray-300"
                  >
                    No
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setConfirmId(clip.id)}
                  className="p-1 text-gray-400 hover:text-red-600 transition-colors"
                  title="Delete clip"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M3 6h18" />
                    <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
                    <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
                  </svg>
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
