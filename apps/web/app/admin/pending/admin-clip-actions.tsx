'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSupabase } from '@/components/providers/supabase-provider';

type Props = {
  clipId: string;
};

export function AdminClipActions({ clipId }: Props) {
  const { supabase } = useSupabase();
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const updateStatus = async (status: 'APPROVED' | 'REJECTED', isFeatured = false) => {
    setLoading(true);

    const { error } = await supabase
      .from('clips')
      .update({
        status,
        is_featured: isFeatured,
      })
      .eq('id', clipId);

    if (!error) {
      router.refresh();
    } else {
      alert('Failed to update clip status');
    }

    setLoading(false);
  };

  return (
    <div className="flex flex-col gap-2">
      <button
        onClick={() => updateStatus('APPROVED', true)}
        disabled={loading}
        className="px-4 py-2 bg-yellow-500 text-white text-sm rounded hover:bg-yellow-600 disabled:opacity-50"
      >
        Approve + Feature
      </button>
      <button
        onClick={() => updateStatus('APPROVED')}
        disabled={loading}
        className="px-4 py-2 bg-green-600 text-white text-sm rounded hover:bg-green-700 disabled:opacity-50"
      >
        Approve
      </button>
      <button
        onClick={() => updateStatus('REJECTED')}
        disabled={loading}
        className="px-4 py-2 bg-red-600 text-white text-sm rounded hover:bg-red-700 disabled:opacity-50"
      >
        Reject
      </button>
    </div>
  );
}
