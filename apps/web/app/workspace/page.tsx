'use client';

import { useEffect, useState, useCallback } from 'react';
import { Header } from '@/components/ui/header';
import { VideoQueue } from '@/components/workspace/video-queue';
import { WorkspacePlayer } from '@/components/workspace/workspace-player';
import { ClipForm } from '@/components/workspace/clip-form';
import { ClipHistory } from '@/components/workspace/clip-history';
import {
  getQueueVideos,
  getChannels,
  getVideoClips,
  updateVideoStatus,
} from './actions';
import type { WorkQueueVideo, YouTubeChannel, ClipWithVerse } from '@/types/workspace';

export default function WorkspacePage() {
  const [videos, setVideos] = useState<WorkQueueVideo[]>([]);
  const [channels, setChannels] = useState<YouTubeChannel[]>([]);
  const [categories, setCategories] = useState<{ id: string; slug: string; name_en: string }[]>([]);
  const [selectedVideo, setSelectedVideo] = useState<WorkQueueVideo | null>(null);
  const [videoClips, setVideoClips] = useState<ClipWithVerse[]>([]);
  const [startTime, setStartTime] = useState(0);
  const [endTime, setEndTime] = useState(0);
  const [loading, setLoading] = useState(true);
  const [filterChannelId, setFilterChannelId] = useState<string | null>(null);

  // Load initial data
  useEffect(() => {
    async function loadData() {
      try {
        const [videosData, channelsData] = await Promise.all([
          getQueueVideos(),
          getChannels(),
        ]);
        setVideos(videosData);
        setChannels(channelsData);

        // Load categories from API
        const res = await fetch('/api/categories');
        const cats = await res.json();
        setCategories(cats);
      } catch (err) {
        console.error('Failed to load data:', err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  // Load clips when video selected
  useEffect(() => {
    if (selectedVideo) {
      getVideoClips(selectedVideo.youtube_video_id).then(setVideoClips);
      setStartTime(0);
      setEndTime(0);
    }
  }, [selectedVideo]);

  const handleFilterChange = async (channelId: string | null) => {
    setFilterChannelId(channelId);
    const videosData = await getQueueVideos(channelId || undefined);
    setVideos(videosData);
  };

  const handleTimeCapture = useCallback((type: 'start' | 'end', time: number) => {
    if (type === 'start') {
      setStartTime(time);
    } else {
      setEndTime(time);
    }
  }, []);

  const handleClipSaved = async () => {
    if (selectedVideo) {
      const clips = await getVideoClips(selectedVideo.youtube_video_id);
      setVideoClips(clips);
      // Refresh video list to update clips_created count
      const videosData = await getQueueVideos(filterChannelId || undefined);
      setVideos(videosData);
    }
  };

  const handleVideoStatus = async (status: 'completed' | 'skipped') => {
    if (!selectedVideo) return;

    await updateVideoStatus(selectedVideo.youtube_video_id, status);
    setSelectedVideo(null);
    setVideoClips([]);

    // Refresh video list
    const videosData = await getQueueVideos(filterChannelId || undefined);
    setVideos(videosData);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100">
        <Header />
        <div className="flex items-center justify-center h-[calc(100vh-64px)]">
          <div className="text-gray-500">Loading workspace...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <Header />

      <div className="flex h-[calc(100vh-64px)]">
        {/* Left Panel - Video Queue */}
        <div className="w-80 bg-white border-r flex-shrink-0">
          <VideoQueue
            videos={videos}
            channels={channels}
            selectedVideoId={selectedVideo?.youtube_video_id || null}
            onSelectVideo={setSelectedVideo}
            onFilterChange={handleFilterChange}
          />
        </div>

        {/* Right Panel - Player & Form */}
        <div className="flex-1 overflow-y-auto p-6">
          {selectedVideo ? (
            <div className="max-w-4xl mx-auto space-y-6">
              {/* Video Title */}
              <h2 className="text-xl font-semibold text-gray-900 line-clamp-2">
                {selectedVideo.title}
              </h2>

              {/* Player */}
              <WorkspacePlayer
                videoId={selectedVideo.youtube_video_id}
                onTimeCapture={handleTimeCapture}
              />

              {/* Clip Form */}
              <ClipForm
                youtubeVideoId={selectedVideo.youtube_video_id}
                startTime={startTime}
                endTime={endTime}
                onSaved={handleClipSaved}
                categories={categories}
              />

              {/* Clip History */}
              <ClipHistory clips={videoClips} onDeleted={handleClipSaved} />

              {/* Video Actions */}
              <div className="flex gap-3 pt-4 border-t">
                <button
                  onClick={() => handleVideoStatus('skipped')}
                  className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 text-sm"
                >
                  Skip Video
                </button>
                <button
                  onClick={() => handleVideoStatus('completed')}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm"
                >
                  Mark Complete
                </button>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-center h-full text-gray-500">
              Select a video from the queue to start creating clips
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
