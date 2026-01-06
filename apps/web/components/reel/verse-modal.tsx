'use client';

import { useEffect, useState } from 'react';

type VerseModalProps = {
  book: string;
  chapter: number;
  verseStart: number;
  verseEnd?: number | null;
  onClose: () => void;
};

type VerseData = {
  text: string;
};

export function VerseModal({ book, chapter, verseStart, verseEnd, onClose }: VerseModalProps) {
  const [verseText, setVerseText] = useState<string>('');
  const [verseTextJa, setVerseTextJa] = useState<string>('');
  const [loading, setLoading] = useState(true);

  const verseRef = verseEnd
    ? `${book} ${chapter}:${verseStart}-${verseEnd}`
    : `${book} ${chapter}:${verseStart}`;

  useEffect(() => {
    async function fetchVerse() {
      try {
        // Fetch English (KJV)
        const bookSlug = book.toLowerCase().replace(/\s+/g, '');
        const enUrl = `https://cdn.jsdelivr.net/gh/wldeh/bible-api/bibles/en-kjv/books/${bookSlug}/chapters/${chapter}/verses/${verseStart}.json`;
        const enRes = await fetch(enUrl);
        if (enRes.ok) {
          const enData: VerseData = await enRes.json();
          setVerseText(enData.text || '');
        }

        // Fetch Japanese
        const jaUrl = `https://cdn.jsdelivr.net/gh/wldeh/bible-api/bibles/ja-kougo/books/${bookSlug}/chapters/${chapter}/verses/${verseStart}.json`;
        const jaRes = await fetch(jaUrl);
        if (jaRes.ok) {
          const jaData: VerseData = await jaRes.json();
          setVerseTextJa(jaData.text || '');
        }
      } catch (error) {
        console.error('Failed to fetch verse:', error);
      } finally {
        setLoading(false);
      }
    }

    fetchVerse();
  }, [book, chapter, verseStart]);

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center">
      <div className="bg-white w-full sm:max-w-lg sm:rounded-lg max-h-[80vh] overflow-auto">
        <div className="sticky top-0 bg-white border-b px-4 py-3 flex items-center justify-between">
          <h2 className="font-semibold">{verseRef}</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700 text-xl">
            X
          </button>
        </div>

        <div className="p-4 space-y-4">
          {loading ? (
            <div className="text-center py-8 text-gray-500">Loading verse...</div>
          ) : (
            <>
              {verseText && (
                <div>
                  <p className="text-gray-800 leading-relaxed">{verseText}</p>
                </div>
              )}
              {verseTextJa && (
                <div className="pt-4 border-t">
                  <p className="text-gray-600 leading-relaxed">{verseTextJa}</p>
                </div>
              )}
              {!verseText && !verseTextJa && (
                <p className="text-gray-500">Verse text not available.</p>
              )}
            </>
          )}
        </div>

        <div className="p-4 border-t">
          <a
            href={`https://www.biblegateway.com/passage/?search=${encodeURIComponent(verseRef)}&version=NIV`}
            target="_blank"
            rel="noopener noreferrer"
            className="block w-full text-center py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Read on Bible Gateway
          </a>
        </div>
      </div>
    </div>
  );
}
