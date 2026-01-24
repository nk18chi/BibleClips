"use client";

import type { WorkQueueVideo, YouTubeChannel } from "@/types/workspace";

type VideoStatus = "pending" | "completed" | "skipped";

type VideoQueueProps = {
  videos: WorkQueueVideo[];
  channels: YouTubeChannel[];
  selectedVideoId: string | null;
  filterChannelId: string | null;
  filterStatus: VideoStatus;
  onSelectVideo: (video: WorkQueueVideo) => void;
  onFilterChange: (channelId: string | null, status: VideoStatus) => void;
};

function formatNumber(num: number): string {
  if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
  if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
  return num.toString();
}

const STATUS_LABELS: Record<VideoStatus, string> = {
  pending: "Pending",
  completed: "Completed",
  skipped: "Skipped",
};

export function VideoQueue({
  videos,
  channels,
  selectedVideoId,
  filterChannelId,
  filterStatus,
  onSelectVideo,
  onFilterChange,
}: VideoQueueProps) {
  const handleChannelChange = (channelId: string) => {
    const newValue = channelId === "" ? null : channelId;
    onFilterChange(newValue, filterStatus);
  };

  const handleStatusChange = (status: VideoStatus) => {
    onFilterChange(filterChannelId, status);
  };

  return (
    <div className="flex flex-col h-full">
      {/* Status Tabs */}
      <div className="flex border-b">
        {(["pending", "completed", "skipped"] as VideoStatus[]).map((status) => (
          <button
            key={status}
            onClick={() => handleStatusChange(status)}
            className={`flex-1 px-3 py-2 text-sm font-medium transition-colors ${
              filterStatus === status
                ? "text-blue-600 border-b-2 border-blue-600 bg-blue-50"
                : "text-gray-500 hover:text-gray-700 hover:bg-gray-50"
            }`}
          >
            {STATUS_LABELS[status]}
          </button>
        ))}
      </div>

      {/* Channel Filter */}
      <div className="p-3 border-b">
        <select
          value={filterChannelId || ""}
          onChange={(e) => handleChannelChange(e.target.value)}
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
          <div className="p-4 text-center text-gray-500">No videos in queue</div>
        ) : (
          videos.map((video) => (
            <button
              key={video.id}
              onClick={() => onSelectVideo(video)}
              className={`w-full p-3 border-b hover:bg-gray-50 text-left transition-colors ${
                selectedVideoId === video.youtube_video_id ? "bg-blue-50 border-l-4 border-l-blue-500" : ""
              }`}
            >
              <div className="flex gap-3">
                {video.thumbnail_url && (
                  <img src={video.thumbnail_url} alt="" className="w-24 h-14 object-cover rounded" />
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 line-clamp-2">{video.title}</p>
                  <div className="flex items-center gap-2 mt-1 text-xs text-gray-500">
                    <span>👍 {formatNumber(video.like_count)}</span>
                    <span>👁 {formatNumber(video.view_count)}</span>
                    {video.clips_created > 0 && <span className="text-green-600">✓ {video.clips_created} clips</span>}
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
