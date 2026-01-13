'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Header } from '@/components/ui/header';
import { VideoQueue } from '@/components/workspace/video-queue';
import { WorkspacePlayer } from '@/components/workspace/workspace-player';
import { ClipForm } from '@/components/workspace/clip-form';
import { ClipHistory } from '@/components/workspace/clip-history';
import { useSupabase } from '@/components/providers/supabase-provider';
import {
  getQueueVideos,
  getChannels,
  getVideoClips,
  updateVideoStatus,
} from './actions';
import type { WorkQueueVideo, YouTubeChannel, ClipWithVerse } from '@/types/workspace';

export default function WorkspacePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, userRole, isAdmin, canAccessWorkspace, loading: authLoading } = useSupabase();
  const [videos, setVideos] = useState<WorkQueueVideo[]>([]);
  const [channels, setChannels] = useState<YouTubeChannel[]>([]);
  const [categories, setCategories] = useState<{ id: string; slug: string; name_en: string }[]>([]);
  const [selectedVideo, setSelectedVideo] = useState<WorkQueueVideo | null>(null);
  const [videoClips, setVideoClips] = useState<ClipWithVerse[]>([]);
  const [startTime, setStartTime] = useState(0);
  const [endTime, setEndTime] = useState(0);
  const [loading, setLoading] = useState(true);
  const [filterChannelId, setFilterChannelId] = useState<string | null>(null);

  // Redirect if not authenticated
  useEffect(() => {
    if (authLoading) return;

    if (!user) {
      router.push('/login?redirectTo=/workspace');
    }
  }, [authLoading, user, router]);

  // Redirect if role loaded and not allowed
  useEffect(() => {
    if (authLoading || !user) return;
    if (userRole !== null && !canAccessWorkspace) {
      router.push('/');
    }
  }, [authLoading, user, canAccessWorkspace, userRole, router]);

  // Load initial data (only if logged in - role check is separate)
  useEffect(() => {
    if (authLoading || !user) return;

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
  }, [authLoading, user]);

  // Select video from URL parameter when videos are loaded
  useEffect(() => {
    const videoId = searchParams.get('id');
    if (videoId && videos.length > 0 && !selectedVideo) {
      const video = videos.find(v => v.youtube_video_id === videoId);
      if (video) {
        setSelectedVideo(video);
      }
    }
  }, [searchParams, videos, selectedVideo]);

  // Load clips when video selected
  useEffect(() => {
    if (selectedVideo) {
      getVideoClips(selectedVideo.youtube_video_id).then(setVideoClips);
      setStartTime(0);
      setEndTime(0);
    }
  }, [selectedVideo]);

  // Handle video selection and update URL
  const handleSelectVideo = useCallback((video: WorkQueueVideo | null) => {
    setSelectedVideo(video);
    if (video) {
      router.replace(`/workspace?id=${video.youtube_video_id}`, { scroll: false });
    } else {
      router.replace('/workspace', { scroll: false });
    }
  }, [router]);

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
    router.replace('/workspace', { scroll: false });

    // Refresh video list
    const videosData = await getQueueVideos(filterChannelId || undefined);
    setVideos(videosData);
  };

  // Show loading while auth is checking or data is loading
  if (authLoading || loading || !user) {
    return (
      <div className="min-h-screen bg-gray-100">
        <Header />
        <div className="flex items-center justify-center h-[calc(100vh-64px)]">
          <div className="text-gray-500">
            {authLoading ? 'Checking authentication...' : 'Loading workspace...'}
          </div>
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
            onSelectVideo={handleSelectVideo}
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
              <ClipHistory clips={videoClips} onDeleted={handleClipSaved} isAdmin={isAdmin} />

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
