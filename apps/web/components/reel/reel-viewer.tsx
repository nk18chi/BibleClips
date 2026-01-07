"use client";

import { useState, useCallback } from "react";
import { YouTubePlayer } from "./youtube-player";
import { ActionButtons } from "./action-buttons";
import { VerseModal } from "./verse-modal";
import { SubtitleOverlay } from "./subtitle-overlay";
import { Header } from "@/components/ui/header";
import Link from "next/link";

type WordTiming = {
  word: string;
  start: number;
  end: number;
};

type Clip = {
  id: string;
  title: string;
  youtube_video_id: string;
  start_time: number;
  end_time: number;
  vote_count: number;
  has_voted: boolean;
  wordTimings?: WordTiming[];
  clip_verses: {
    book: string;
    book_ja: string;
    chapter: number;
    verse_start: number;
    verse_end: number | null;
  }[];
  clip_categories: {
    categories: {
      slug: string;
      name_en: string;
    } | null;
  }[];
};

type ReelViewerProps = {
  clips: Clip[];
  initialIndex?: number;
  showHeader?: boolean;
};

export function ReelViewer({ clips, initialIndex = 0, showHeader = false }: ReelViewerProps) {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [showVerseModal, setShowVerseModal] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);

  const currentClip = clips[currentIndex];

  const goToNext = useCallback(() => {
    if (currentIndex < clips.length - 1) {
      setCurrentIndex((i) => i + 1);
    }
  }, [currentIndex, clips.length]);

  const goToPrev = useCallback(() => {
    if (currentIndex > 0) {
      setCurrentIndex((i) => i - 1);
    }
  }, [currentIndex]);

  if (!currentClip) {
    return (
      <div className='h-screen flex items-center justify-center bg-black text-white'>
        <p>No clips available</p>
      </div>
    );
  }

  const verse = currentClip.clip_verses[0];
  const verseRef = verse
    ? verse.verse_end
      ? `${verse.book} ${verse.chapter}:${verse.verse_start}-${verse.verse_end}`
      : `${verse.book} ${verse.chapter}:${verse.verse_start}`
    : "";

  const bibleGatewayUrl = verse ? `https://www.biblegateway.com/passage/?search=${encodeURIComponent(verseRef)}&version=NIV` : "";

  return (
    <div className='h-screen bg-white relative overflow-hidden flex flex-col'>
      {/* Header */}
      {showHeader ? (
        <Header />
      ) : (
        <Link href='/' className='absolute top-4 right-4 z-20 bg-white/20 hover:bg-white/30 text-white p-2 rounded-full'>
          X
        </Link>
      )}

      {/* Main content area - constrained to mobile aspect ratio */}
      <div className='flex-1 flex items-start justify-center gap-4 px-4 pt-4 overflow-hidden'>
        {/* Videos column */}
        <div className='flex flex-col gap-2 max-w-[500px] w-full h-full'>
          {/* Current video container - takes most of the height */}
          <div className='relative w-full flex-1 min-h-0 rounded-lg overflow-hidden'>
            {/* Verse reference overlay */}
            {verse && (
              <div className='absolute top-24 left-0 right-0 z-10 flex justify-center'>
                <a
                  href={bibleGatewayUrl}
                  target='_blank'
                  rel='noopener noreferrer'
                  className='bg-white text-black text-3xl sm:text-5xl font-semibold px-6 sm:px-10 py-3 sm:py-5 rounded-full shadow-lg hover:bg-gray-100 transition-colors'
                >
                  {verseRef}
                </a>
              </div>
            )}

            {/* Video Player */}
            <div className='h-full'>
              <YouTubePlayer
                key={currentClip.id}
                videoId={currentClip.youtube_video_id}
                startTime={currentClip.start_time}
                endTime={currentClip.end_time}
                onEnded={goToNext}
                onTimeUpdate={setCurrentTime}
              />
            </div>

            {/* Subtitle Overlay */}
            {currentClip.wordTimings && currentClip.wordTimings.length > 0 && (
              <SubtitleOverlay wordTimings={currentClip.wordTimings} currentTime={currentTime} />
            )}

            {/* Bottom Info */}
            <div className='absolute bottom-0 left-0 right-0 z-10 p-4 bg-gradient-to-t from-black/70 to-transparent'>
              <h3 className='text-white font-medium mb-1'>{currentClip.title}</h3>
              <div className='flex flex-wrap gap-2'>
                {currentClip.clip_categories?.map((cc) =>
                  cc.categories ? (
                    <Link key={cc.categories.slug} href={`/category/${cc.categories.slug}`} className='text-blue-400 text-sm hover:underline'>
                      #{cc.categories.name_en.toLowerCase()}
                    </Link>
                  ) : null
                )}
              </div>

              {/* Clip counter */}
              <div className='mt-2 text-white/50 text-xs'>
                {currentIndex + 1} / {clips.length}
              </div>
            </div>
          </div>

          {/* Next video preview - just a small peek */}
          {currentIndex < clips.length - 1 && (
            <div
              className='relative w-full h-16 rounded-t-lg overflow-hidden flex-shrink-0 bg-gray-800 cursor-pointer hover:bg-gray-700 transition-colors'
              onClick={goToNext}
            />
          )}
        </div>

        {/* Action Buttons - Right side outside video (desktop only) */}
        <div className='hidden sm:flex flex-col items-center justify-end pb-24 h-full'>
          <ActionButtons
            clipId={currentClip.id}
            youtubeVideoId={currentClip.youtube_video_id}
            voteCount={currentClip.vote_count}
            hasVoted={currentClip.has_voted}
            onVerseClick={() => setShowVerseModal(true)}
          />
        </div>

        {/* Action Buttons - Mobile (inside video) */}
        <div className='absolute right-4 bottom-32 z-10 sm:hidden'>
          <ActionButtons
            clipId={currentClip.id}
            youtubeVideoId={currentClip.youtube_video_id}
            voteCount={currentClip.vote_count}
            hasVoted={currentClip.has_voted}
            onVerseClick={() => setShowVerseModal(true)}
          />
        </div>
      </div>

      {/* Verse Modal */}
      {showVerseModal && verse && (
        <VerseModal
          book={verse.book}
          chapter={verse.chapter}
          verseStart={verse.verse_start}
          verseEnd={verse.verse_end}
          onClose={() => setShowVerseModal(false)}
        />
      )}
    </div>
  );
}
