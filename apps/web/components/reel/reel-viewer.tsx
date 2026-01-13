"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { YouTubePlayer } from "./youtube-player";
import { ActionButtons } from "./action-buttons";
import { VerseModal } from "./verse-modal";
import { SubtitleOverlay } from "./subtitle-overlay";
import { Header } from "@/components/ui/header";
import { useLanguage } from "@/components/providers/language-provider";
import Link from "next/link";

type WordTiming = {
  word: string;
  start: number;
  end: number;
};

type SentenceTranslation = {
  language: string;
  text: string;
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
  language: 'en' | 'ja';
  wordTimings?: WordTiming[];
  translations?: SentenceTranslation[];
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

function ReelCard({
  clip,
  isActive,
  index,
  total,
  onVerseClick,
}: {
  clip: Clip;
  isActive: boolean;
  index: number;
  total: number;
  onVerseClick: () => void;
}) {
  const [currentTime, setCurrentTime] = useState(0);
  const { language } = useLanguage();

  const verse = clip.clip_verses[0];

  // Use Japanese book name when Japanese is selected
  const bookName = language === 'ja' && verse?.book_ja ? verse.book_ja : verse?.book;
  const verseRef = verse
    ? verse.verse_end
      ? `${bookName} ${verse.chapter}:${verse.verse_start}-${verse.verse_end}`
      : `${bookName} ${verse.chapter}:${verse.verse_start}`
    : "";

  // Always use English for Bible Gateway URL
  const verseRefEn = verse
    ? verse.verse_end
      ? `${verse.book} ${verse.chapter}:${verse.verse_start}-${verse.verse_end}`
      : `${verse.book} ${verse.chapter}:${verse.verse_start}`
    : "";
  const bibleGatewayUrl = verse ? `https://www.biblegateway.com/passage/?search=${encodeURIComponent(verseRefEn)}&version=NIV` : "";

  return (
    <div className='relative w-full h-full rounded-lg overflow-hidden bg-black'>
      {/* Verse reference overlay */}
      {verse && (
        <div className='absolute top-24 left-0 right-0 z-10 flex justify-center'>
          <a
            href={bibleGatewayUrl}
            target='_blank'
            rel='noopener noreferrer'
            className='bg-white text-black text-2xl sm:text-4xl font-semibold px-5 sm:px-8 py-2 sm:py-4 rounded-full shadow-lg hover:bg-gray-100 transition-colors'
          >
            {verseRef}
          </a>
        </div>
      )}

      {/* Video Player - only render if active */}
      <div className='h-full'>
        {isActive ? (
          <YouTubePlayer
            key={clip.id}
            videoId={clip.youtube_video_id}
            startTime={clip.start_time}
            endTime={clip.end_time}
            onTimeUpdate={setCurrentTime}
          />
        ) : (
          <div className='h-full flex items-center justify-center bg-gray-900'>
            <span className='text-white text-lg'>{clip.title}</span>
          </div>
        )}
      </div>

      {/* Subtitle Overlay */}
      {isActive && clip.wordTimings && clip.wordTimings.length > 0 && (
        <SubtitleOverlay
          wordTimings={clip.wordTimings}
          translations={clip.translations}
          currentTime={currentTime}
          videoLanguage={clip.language}
        />
      )}

      {/* Bottom Info */}
      <div className='absolute bottom-0 left-0 right-0 z-10 p-4 bg-gradient-to-t from-black/70 to-transparent'>
        <h3 className='text-white font-medium mb-1'>{clip.title}</h3>
        <div className='flex flex-wrap gap-2'>
          {clip.clip_categories?.map((cc) =>
            cc.categories ? (
              <Link key={cc.categories.slug} href={`/category/${cc.categories.slug}`} className='text-blue-400 text-sm hover:underline'>
                #{cc.categories.name_en.toLowerCase()}
              </Link>
            ) : null
          )}
        </div>

        {/* Clip counter */}
        <div className='mt-2 text-white/50 text-xs'>
          {index + 1} / {total}
        </div>
      </div>

      {/* Action Buttons - Inside video on right */}
      <div className='absolute right-3 bottom-24 z-10'>
        <ActionButtons
          clipId={clip.id}
          youtubeVideoId={clip.youtube_video_id}
          voteCount={clip.vote_count}
          hasVoted={clip.has_voted}
          onVerseClick={onVerseClick}
        />
      </div>
    </div>
  );
}

export function ReelViewer({ clips, initialIndex = 0, showHeader = false }: ReelViewerProps) {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [showVerseModal, setShowVerseModal] = useState(false);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const isScrollingRef = useRef(false);

  const currentClip = clips[currentIndex];

  // Handle scroll snap detection
  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) return;

    const handleScroll = () => {
      if (isScrollingRef.current) return;

      const scrollTop = container.scrollTop;
      const itemHeight = container.clientHeight;
      const newIndex = Math.round(scrollTop / itemHeight);

      if (newIndex !== currentIndex && newIndex >= 0 && newIndex < clips.length) {
        setCurrentIndex(newIndex);
      }
    };

    container.addEventListener("scroll", handleScroll, { passive: true });
    return () => container.removeEventListener("scroll", handleScroll);
  }, [currentIndex, clips.length]);

  // Scroll to initial index on mount
  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container || initialIndex === 0) return;

    const itemHeight = container.clientHeight;
    container.scrollTop = initialIndex * itemHeight;
  }, []);

  if (!currentClip) {
    return (
      <div className='h-screen flex items-center justify-center bg-black text-white'>
        <p>No clips available</p>
      </div>
    );
  }

  const verse = currentClip.clip_verses[0];

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

      {/* Main content area */}
      <div className='flex-1 flex items-center justify-center overflow-hidden'>
        {/* Scroll container with snap */}
        <div
          ref={scrollContainerRef}
          className='h-full w-full max-w-[500px] overflow-y-scroll snap-y snap-mandatory scrollbar-hide'
          style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
        >
          {clips.map((clip, index) => (
            <div key={clip.id} className='w-full snap-start snap-always flex-shrink-0 p-2' style={{ height: "calc(100% - 40px)" }}>
              <ReelCard
                clip={clip}
                isActive={index === currentIndex}
                index={index}
                total={clips.length}
                onVerseClick={() => setShowVerseModal(true)}
              />
            </div>
          ))}
          {/* Spacer at the end so last video can scroll to show peek */}
          <div className='h-10 flex-shrink-0' />
        </div>

        {/* Action Buttons - Right side outside video (desktop only) */}
        <div className='hidden sm:flex flex-col items-center justify-end pb-24 h-full ml-4'>
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

      {/* Hide scrollbar */}
      <style jsx global>{`
        .scrollbar-hide::-webkit-scrollbar {
          display: none;
        }
      `}</style>
    </div>
  );
}
