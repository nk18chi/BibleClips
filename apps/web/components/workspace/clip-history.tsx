'use client';

import { useState } from 'react';
import { deleteClip, updateClip, generateClipSubtitles } from '@/app/workspace/actions';
import type { ClipWithVerse } from '@/types/workspace';

type ClipHistoryProps = {
  clips: ClipWithVerse[];
  onDeleted: () => void;
  isAdmin: boolean;
};

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

function parseTime(timeStr: string): number | null {
  const parts = timeStr.split(':');
  if (parts.length !== 2) return null;
  const [minStr, secStr] = parts;
  const min = parseInt(minStr || '0', 10);
  const sec = parseInt(secStr || '0', 10);
  if (isNaN(min) || isNaN(sec)) return null;
  return min * 60 + sec;
}

export function ClipHistory({ clips, onDeleted, isAdmin }: ClipHistoryProps) {
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editStart, setEditStart] = useState('');
  const [editEnd, setEditEnd] = useState('');
  const [saving, setSaving] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

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

  const handleStartEdit = (clip: ClipWithVerse) => {
    setEditingId(clip.id);
    setEditStart(formatTime(clip.start_time));
    setEditEnd(formatTime(clip.end_time));
    setEditError(null);
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditStart('');
    setEditEnd('');
    setEditError(null);
  };

  const handleSaveEdit = async (clipId: string) => {
    const startTime = parseTime(editStart);
    const endTime = parseTime(editEnd);

    if (startTime === null || endTime === null) {
      setEditError('Invalid time format (use m:ss)');
      return;
    }

    if (endTime <= startTime) {
      setEditError('End must be after start');
      return;
    }

    setSaving(true);
    setEditError(null);

    try {
      await updateClip({ clipId, startTime, endTime });
      await generateClipSubtitles(clipId);
      handleCancelEdit();
      onDeleted(); // Refresh the list
    } catch (err) {
      console.error('Failed to update clip:', err);
      setEditError(err instanceof Error ? err.message : 'Failed to save');
    } finally {
      setSaving(false);
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

          const isEditing = editingId === clip.id;

          return (
            <div key={clip.id} className="bg-white p-2 rounded border">
              {isEditing ? (
                <div className="space-y-2">
                  <div className="text-sm font-medium">{verseRef}</div>
                  <div className="flex items-center gap-2">
                    <label className="text-xs text-gray-500">Start:</label>
                    <input
                      type="text"
                      value={editStart}
                      onChange={(e) => setEditStart(e.target.value)}
                      placeholder="0:00"
                      className="w-16 px-2 py-1 border rounded text-sm font-mono"
                      disabled={saving}
                    />
                    <label className="text-xs text-gray-500">End:</label>
                    <input
                      type="text"
                      value={editEnd}
                      onChange={(e) => setEditEnd(e.target.value)}
                      placeholder="0:00"
                      className="w-16 px-2 py-1 border rounded text-sm font-mono"
                      disabled={saving}
                    />
                  </div>
                  {editError && (
                    <div className="text-xs text-red-600">{editError}</div>
                  )}
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleSaveEdit(clip.id)}
                      disabled={saving}
                      className="px-3 py-1 bg-blue-600 text-white text-xs rounded hover:bg-blue-700 disabled:opacity-50"
                    >
                      {saving ? 'Saving...' : 'Save'}
                    </button>
                    <button
                      onClick={handleCancelEdit}
                      disabled={saving}
                      className="px-3 py-1 bg-gray-200 text-gray-700 text-xs rounded hover:bg-gray-300 disabled:opacity-50"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-between">
                  <div className="text-sm">
                    <span className="font-medium">{verseRef}</span>
                    <span className="text-gray-500 ml-2">
                      ({formatTime(clip.start_time)} - {formatTime(clip.end_time)})
                    </span>
                  </div>

                  {isAdmin && (
                    <div className="flex items-center gap-1">
                      {deletingId === clip.id ? (
                        <span className="text-xs text-gray-500">Deleting...</span>
                      ) : confirmId === clip.id ? (
                        <>
                          <button
                            onClick={() => handleDelete(clip.id)}
                            className="px-2 py-1 bg-red-600 text-white text-xs rounded hover:bg-red-700"
                          >
                            Yes
                          </button>
                          <button
                            onClick={() => setConfirmId(null)}
                            className="px-2 py-1 bg-gray-200 text-gray-700 text-xs rounded hover:bg-gray-300"
                          >
                            No
                          </button>
                        </>
                      ) : (
                        <>
                          <button
                            onClick={() => handleStartEdit(clip)}
                            className="p-1 text-gray-400 hover:text-blue-600 transition-colors"
                            title="Edit clip"
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
                              <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" />
                              <path d="m15 5 4 4" />
                            </svg>
                          </button>
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
                        </>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
