'use client';

import { useState, useCallback } from 'react';
import { YouTubePlayer } from './youtube-player';
import { ActionButtons } from './action-buttons';
import { VerseModal } from './verse-modal';
import Link from 'next/link';

type Clip = {
  id: string;
  title: string;
  youtube_video_id: string;
  start_time: number;
  end_time: number;
  vote_count: number;
  has_voted: boolean;
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
};

export function ReelViewer({ clips, initialIndex = 0 }: ReelViewerProps) {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [showVerseModal, setShowVerseModal] = useState(false);

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
      <div className="h-screen flex items-center justify-center bg-black text-white">
        <p>No clips available</p>
      </div>
    );
  }

  const verse = currentClip.clip_verses[0];
  const verseRef = verse
    ? verse.verse_end
      ? `${verse.book} ${verse.chapter}:${verse.verse_start}-${verse.verse_end}`
      : `${verse.book} ${verse.chapter}:${verse.verse_start}`
    : '';

  const bibleGatewayUrl = verse
    ? `https://www.biblegateway.com/passage/?search=${encodeURIComponent(verseRef)}&version=NIV`
    : '';

  return (
    <div className="h-screen bg-black relative overflow-hidden">
      {/* Header - Verse reference */}
      <div className="absolute top-0 left-0 right-0 z-10 p-4 bg-gradient-to-b from-black/70 to-transparent">
        {verse && (
          <a
            href={bibleGatewayUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-white font-medium flex items-center gap-1"
          >
            {verseRef} <span className="text-sm">{'\\u2197'}</span>
          </a>
        )}
      </div>

      {/* Video Player */}
      <div className="h-full">
        <YouTubePlayer
          key={currentClip.id}
          videoId={currentClip.youtube_video_id}
          startTime={currentClip.start_time}
          endTime={currentClip.end_time}
          onEnded={goToNext}
        />
      </div>

      {/* Action Buttons - Right side */}
      <div className="absolute right-4 bottom-32 z-10">
        <ActionButtons
          clipId={currentClip.id}
          youtubeVideoId={currentClip.youtube_video_id}
          voteCount={currentClip.vote_count}
          hasVoted={currentClip.has_voted}
          onVerseClick={() => setShowVerseModal(true)}
        />
      </div>

      {/* Bottom Info */}
      <div className="absolute bottom-0 left-0 right-0 z-10 p-4 bg-gradient-to-t from-black/70 to-transparent">
        <h3 className="text-white font-medium mb-1">{currentClip.title}</h3>
        <div className="flex flex-wrap gap-2">
          {currentClip.clip_categories?.map((cc) => (
            cc.categories && (
              <Link
                key={cc.categories.slug}
                href={`/category/${cc.categories.slug}`}
                className="text-blue-400 text-sm"
              >
                #{cc.categories.name_en.toLowerCase()}
              </Link>
            )
          ))}
        </div>
      </div>

      {/* Swipe Navigation Hint */}
      <div className="absolute bottom-20 left-0 right-0 text-center text-white/50 text-sm">
        {currentIndex < clips.length - 1 && 'Swipe up for next'}
      </div>

      {/* Navigation buttons (for desktop) */}
      <div className="absolute left-4 top-1/2 -translate-y-1/2 z-10 hidden sm:flex flex-col gap-2">
        <button
          onClick={goToPrev}
          disabled={currentIndex === 0}
          className="bg-white/20 hover:bg-white/30 text-white p-2 rounded-full disabled:opacity-30"
        >
          {'\u2191'}
        </button>
        <button
          onClick={goToNext}
          disabled={currentIndex === clips.length - 1}
          className="bg-white/20 hover:bg-white/30 text-white p-2 rounded-full disabled:opacity-30"
        >
          {'\u2193'}
        </button>
      </div>

      {/* Close button */}
      <Link
        href="/"
        className="absolute top-4 right-4 z-10 bg-white/20 hover:bg-white/30 text-white p-2 rounded-full"
      >
        X
      </Link>

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
