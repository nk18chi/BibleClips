'use client';

import { useState } from 'react';
import { useSupabase } from '@/components/providers/supabase-provider';
import { z } from 'zod';

const commentReportReasonSchema = z.enum(['spam', 'harassment', 'inappropriate', 'other']);
type CommentReportReason = z.infer<typeof commentReportReasonSchema>;

type ReportModalProps = {
  commentId: string;
  onClose: () => void;
  onReported: () => void;
};

const reasons: { value: CommentReportReason; label: string }[] = [
  { value: 'spam', label: 'Spam' },
  { value: 'harassment', label: 'Harassment' },
  { value: 'inappropriate', label: 'Inappropriate content' },
  { value: 'other', label: 'Other' },
];

export function ReportModal({ commentId, onClose, onReported }: ReportModalProps) {
  const { supabase, user } = useSupabase();
  const [reason, setReason] = useState<CommentReportReason | ''>('');
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!user || !reason || submitting) return;

    const reasonResult = commentReportReasonSchema.safeParse(reason);
    if (!reasonResult.success) {
      setError('Please select a reason');
      return;
    }

    setSubmitting(true);
    setError(null);

    const { error: insertError } = await supabase
      .from('comment_reports')
      .insert({
        comment_id: commentId,
        user_id: user.id,
        reason,
        description: description.trim() || null,
      });

    if (insertError) {
      if (insertError.code === '23505') {
        setError('You have already reported this comment.');
      } else {
        setError('Failed to submit report. Please try again.');
      }
      setSubmitting(false);
      return;
    }

    onReported();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={onClose}>
      <div
        className="bg-white rounded-lg w-full max-w-md mx-4 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold">Report Comment</h2>
        </div>

        <form onSubmit={handleSubmit} className="p-4">
          {error && (
            <p className="text-red-500 text-sm mb-4">{error}</p>
          )}

          <div className="space-y-3 mb-4">
            <p className="text-sm text-gray-600">Why are you reporting this comment?</p>
            {reasons.map((r) => (
              <label key={r.value} className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="reason"
                  value={r.value}
                  checked={reason === r.value}
                  onChange={(e) => setReason(e.target.value as CommentReportReason)}
                  className="w-4 h-4 text-blue-600"
                />
                <span className="text-sm">{r.label}</span>
              </label>
            ))}
          </div>

          {reason === 'other' && (
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Please describe the issue..."
              maxLength={500}
              rows={3}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm mb-4 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          )}

          <div className="flex gap-2 justify-end">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!reason || submitting}
              className="px-4 py-2 text-sm text-white bg-red-600 hover:bg-red-700 rounded-lg disabled:opacity-50 transition-colors"
            >
              {submitting ? 'Submitting...' : 'Submit Report'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
