'use client';

import { useState } from 'react';
import type { WorkQueueVideo, YouTubeChannel } from '@/types/workspace';

type VideoQueueProps = {
  videos: WorkQueueVideo[];
  channels: YouTubeChannel[];
  selectedVideoId: string | null;
  onSelectVideo: (video: WorkQueueVideo) => void;
  onFilterChange: (channelId: string | null) => void;
};

function formatNumber(num: number): string {
  if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
  if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
  return num.toString();
}

export function VideoQueue({
  videos,
  channels,
  selectedVideoId,
  onSelectVideo,
  onFilterChange,
}: VideoQueueProps) {
  const [filterChannelId, setFilterChannelId] = useState<string | null>(null);

  const handleFilterChange = (channelId: string) => {
    const newValue = channelId === '' ? null : channelId;
    setFilterChannelId(newValue);
    onFilterChange(newValue);
  };

  return (
    <div className="flex flex-col h-full">
      {/* Channel Filter */}
      <div className="p-3 border-b">
        <select
          value={filterChannelId || ''}
          onChange={(e) => handleFilterChange(e.target.value)}
          className="w-full px-3 py-2 border rounded-lg text-sm"
        >
          <option value="">All Channels</option>
          {channels.map((ch) => (
            <option key={ch.id} value={ch.id}>
              {ch.channel_name}
            </option>
          ))}
        </select>
      </div>

      {/* Video List */}
      <div className="flex-1 overflow-y-auto">
        {videos.length === 0 ? (
          <div className="p-4 text-center text-gray-500">
            No videos in queue
          </div>
        ) : (
          videos.map((video) => (
            <button
              key={video.id}
              onClick={() => onSelectVideo(video)}
              className={`w-full p-3 border-b hover:bg-gray-50 text-left transition-colors ${
                selectedVideoId === video.youtube_video_id
                  ? 'bg-blue-50 border-l-4 border-l-blue-500'
                  : ''
              }`}
            >
              <div className="flex gap-3">
                {video.thumbnail_url && (
                  <img
                    src={video.thumbnail_url}
                    alt=""
                    className="w-24 h-14 object-cover rounded"
                  />
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 line-clamp-2">
                    {video.title}
                  </p>
                  <div className="flex items-center gap-2 mt-1 text-xs text-gray-500">
                    <span>👍 {formatNumber(video.like_count)}</span>
                    <span>👁 {formatNumber(video.view_count)}</span>
                    {video.clips_created > 0 && (
                      <span className="text-green-600">
                        ✓ {video.clips_created} clips
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </button>
          ))
        )}
      </div>
    </div>
  );
}
