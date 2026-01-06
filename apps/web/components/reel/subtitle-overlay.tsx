'use client';

import { useState, useEffect } from 'react';

type SubtitleCue = {
  start: number; // seconds
  end: number;   // seconds
  text: string;
};

type SubtitleOverlayProps = {
  cues: SubtitleCue[];
  currentTime: number;
};

export function SubtitleOverlay({ cues, currentTime }: SubtitleOverlayProps) {
  const [currentCue, setCurrentCue] = useState<SubtitleCue | null>(null);

  useEffect(() => {
    const activeCue = cues.find(
      (cue) => currentTime >= cue.start && currentTime < cue.end
    );
    setCurrentCue(activeCue || null);
  }, [currentTime, cues]);

  if (!currentCue) return null;

  // Split text into words - last word gets highlighted
  const words = currentCue.text.split(' ');
  const lastIndex = words.length - 1;

  return (
    <div className="absolute bottom-24 left-0 right-0 flex justify-center px-4 z-20 pointer-events-none">
      <div className="flex flex-wrap justify-center items-baseline gap-x-2 max-w-[90%]">
        {words.map((word, index) => (
          <span
            key={index}
            className={`font-bold text-2xl uppercase tracking-wide ${
              index === lastIndex ? 'text-yellow-400' : 'text-white'
            }`}
            style={{
              textShadow: '2px 2px 4px rgba(0,0,0,0.8)',
            }}
          >
            {word}
          </span>
        ))}
      </div>
    </div>
  );
}
