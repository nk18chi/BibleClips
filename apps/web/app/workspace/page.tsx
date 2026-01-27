"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useCallback, useEffect, useState } from "react";
import { useSupabase } from "@/components/providers/supabase-provider";
import { Header } from "@/components/ui/header";
import { ClipForm } from "@/components/workspace/clip-form";
import { ClipHistory } from "@/components/workspace/clip-history";
import { VideoQueue } from "@/components/workspace/video-queue";
import { WorkspacePlayer } from "@/components/workspace/workspace-player";
import type { ClipWithVerse, WorkQueueVideo, YouTubeChannel } from "@/types/workspace";
import { getVideoClips, updateVideoStatus, type VideoStatus } from "./actions";

function WorkspaceContent() {
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
  const [filterStatus, setFilterStatus] = useState<VideoStatus>("pending");
  const [showMobileQueue, setShowMobileQueue] = useState(!searchParams.get("id"));

  // Redirect if not authenticated
  useEffect(() => {
    if (authLoading) return;

    if (!user) {
      router.push("/login?redirectTo=/workspace");
    }
  }, [authLoading, user, router]);

  // Redirect if role loaded and not allowed
  useEffect(() => {
    if (authLoading || !user) return;
    if (userRole !== null && !canAccessWorkspace) {
      router.push("/");
    }
  }, [authLoading, user, canAccessWorkspace, userRole, router]);

  // Load initial data (only if logged in - role check is separate)
  useEffect(() => {
    if (authLoading || !user) return;

    async function loadData() {
      try {
        const [videosRes, channelsRes, catsRes] = await Promise.all([
          fetch("/api/workspace/videos"),
          fetch("/api/workspace/channels"),
          fetch("/api/categories"),
        ]);

        if (videosRes.ok) {
          setVideos(await videosRes.json());
        }
        if (channelsRes.ok) {
          setChannels(await channelsRes.json());
        }
        if (catsRes.ok) {
          setCategories(await catsRes.json());
        }
      } catch (err) {
        console.error("Failed to load data:", err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [authLoading, user]);

  // Select video from URL parameter when videos are loaded
  useEffect(() => {
    const videoId = searchParams.get("id");
    if (videoId && videos.length > 0 && !selectedVideo) {
      const video = videos.find((v) => v.youtube_video_id === videoId);
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
  const handleSelectVideo = useCallback(
    (video: WorkQueueVideo | null) => {
      setSelectedVideo(video);
      if (video) {
        setShowMobileQueue(false);
        router.replace(`/workspace?id=${video.youtube_video_id}`, { scroll: false });
      } else {
        setShowMobileQueue(true);
        router.replace("/workspace", { scroll: false });
      }
    },
    [router]
  );

  const handleFilterChange = async (channelId: string | null, status: VideoStatus) => {
    setFilterChannelId(channelId);
    setFilterStatus(status);
    const params = new URLSearchParams({ status });
    if (channelId) params.set("channelId", channelId);
    const res = await fetch(`/api/workspace/videos?${params}`);
    if (res.ok) {
      setVideos(await res.json());
    }
  };

  const handleTimeCapture = useCallback((type: "start" | "end", time: number) => {
    if (type === "start") {
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
      const params = new URLSearchParams({ status: filterStatus });
      if (filterChannelId) params.set("channelId", filterChannelId);
      const res = await fetch(`/api/workspace/videos?${params}`);
      if (res.ok) {
        setVideos(await res.json());
      }
    }
  };

  const handleVideoStatus = async (status: "completed" | "skipped") => {
    if (!selectedVideo) return;

    await updateVideoStatus(selectedVideo.youtube_video_id, status);
    setSelectedVideo(null);
    setVideoClips([]);
    router.replace("/workspace", { scroll: false });

    // Refresh video list
    const params = new URLSearchParams({ status: filterStatus });
    if (filterChannelId) params.set("channelId", filterChannelId);
    const res = await fetch(`/api/workspace/videos?${params}`);
    if (res.ok) {
      setVideos(await res.json());
    }
  };

  // Show loading while auth is checking or data is loading
  if (authLoading || loading || !user) {
    return (
      <div className="min-h-screen bg-gray-100">
        <Header />
        <div className="flex items-center justify-center h-[calc(100vh-64px)]">
          <div className="text-gray-500">{authLoading ? "Checking authentication..." : "Loading workspace..."}</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <Header />

      <div className="flex flex-col md:flex-row h-[calc(100vh-64px)]">
        {/* Left Panel - Video Queue */}
        <div className={`
          ${selectedVideo && !showMobileQueue ? 'hidden md:block' : 'block'}
          w-full md:w-80 bg-white border-r flex-shrink-0
          ${!selectedVideo ? 'flex-1 md:flex-initial' : ''}
        `}>
          <VideoQueue
            videos={videos}
            channels={channels}
            selectedVideoId={selectedVideo?.youtube_video_id || null}
            filterChannelId={filterChannelId}
            filterStatus={filterStatus}
            onSelectVideo={handleSelectVideo}
            onFilterChange={handleFilterChange}
          />
        </div>

        {/* Right Panel - Player & Form */}
        <div className={`
          ${showMobileQueue && !selectedVideo ? 'hidden md:block' : 'block'}
          flex-1 overflow-y-auto p-4 md:p-6
        `}>
          {selectedVideo ? (
            <>
              {/* Mobile back button */}
              <button
                onClick={() => setShowMobileQueue(true)}
                className="md:hidden flex items-center gap-2 text-sm text-gray-600 mb-4"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                Back to Queue
              </button>
              <div className="max-w-4xl mx-auto space-y-6">
              {/* Video Title */}
              <h2 className="text-xl font-semibold text-gray-900 line-clamp-2">{selectedVideo.title}</h2>

              {/* Player */}
              <WorkspacePlayer videoId={selectedVideo.youtube_video_id} onTimeCapture={handleTimeCapture} />

              {/* Clip Form */}
              <ClipForm
                youtubeVideoId={selectedVideo.youtube_video_id}
                startTime={startTime}
                endTime={endTime}
                onSaved={handleClipSaved}
                categories={categories}
              />

              {/* Clip History */}
              <ClipHistory clips={videoClips} categories={categories} onDeleted={handleClipSaved} isAdmin={isAdmin} />

              {/* Video Actions */}
              <div className="flex gap-3 pt-4 border-t">
                <button
                  onClick={() => handleVideoStatus("skipped")}
                  className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 text-sm"
                >
                  Skip Video
                </button>
                <button
                  onClick={() => handleVideoStatus("completed")}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm"
                >
                  Mark Complete
                </button>
              </div>
            </div>
            </>
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

export default function WorkspacePage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-gray-100">
          <Header />
          <div className="flex items-center justify-center h-[calc(100vh-64px)]">
            <div className="text-gray-500">Loading workspace...</div>
          </div>
        </div>
      }
    >
      <WorkspaceContent />
    </Suspense>
  );
}
