'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

type Language = 'en' | 'ja';

type LanguageContextType = {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string) => string;
};

const translations: Record<Language, Record<string, string>> = {
  en: {
    'header.signIn': 'Sign in',
    'header.signOut': 'Sign out',
    'header.myClips': 'My Clips',
    'header.admin': 'Admin',
    'header.search': 'Search',
    'header.cancel': 'Cancel',
    'header.searchPlaceholder': 'John 3:16 or #anxiety',
    'reel.noClips': 'No clips available',
    'verse.verse': 'Verse',
    'action.share': 'Share',
    'action.linkCopied': 'Link copied to clipboard!',
  },
  ja: {
    'header.signIn': 'ログイン',
    'header.signOut': 'ログアウト',
    'header.myClips': 'マイクリップ',
    'header.admin': '管理',
    'header.search': '検索',
    'header.cancel': 'キャンセル',
    'header.searchPlaceholder': 'ヨハネ 3:16 または #不安',
    'reel.noClips': 'クリップがありません',
    'verse.verse': '聖句',
    'action.share': '共有',
    'action.linkCopied': 'リンクをコピーしました！',
  },
};

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<Language>('en');

  useEffect(() => {
    // Load saved language from localStorage
    const saved = localStorage.getItem('language') as Language;
    if (saved && (saved === 'en' || saved === 'ja')) {
      setLanguageState(saved);
    }
  }, []);

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
    localStorage.setItem('language', lang);
  };

  const t = (key: string): string => {
    return translations[language][key] || key;
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
}
