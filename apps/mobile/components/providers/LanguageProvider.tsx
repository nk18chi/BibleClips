import AsyncStorage from "@react-native-async-storage/async-storage";
import { createContext, type ReactNode, useContext, useEffect, useState } from "react";

type Language = "en" | "ja";

type LanguageContextType = {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string) => string;
};

const translations: Record<Language, Record<string, string>> = {
  en: {
    "home.all": "All",
    "home.sermons": "Sermons",
    "home.songs": "Songs",
    "home.testimonies": "Testimonies",
    "home.noClips": "No clips yet",
    "browse.search": "Search by verse (e.g. John 3:16) or #category",
    "profile.myClips": "My Clips",
    "profile.signOut": "Sign Out",
    "profile.signIn": "Sign In",
    "profile.createAccount": "Create Account",
    "profile.welcome": "Welcome to BibleClips",
    "profile.submitted": "Submitted",
    "profile.liked": "Liked",
    "profile.commented": "Commented",
    "profile.noSubmitted": "No clips submitted yet",
    "profile.noLiked": "No liked clips",
    "profile.noCommented": "No commented clips",
    "profile.language": "Language",
    "admin.pending": "Pending Clips",
    "admin.approve": "Approve",
    "admin.reject": "Reject",
    "admin.signIn": "Sign in to access admin",
    "admin.noAccess": "Admin access required",
    "admin.noPending": "No pending clips",
  },
  ja: {
    "home.all": "すべて",
    "home.sermons": "説教",
    "home.songs": "賛美歌",
    "home.testimonies": "証し",
    "home.noClips": "クリップがありません",
    "browse.search": "聖句検索（例：ヨハネ 3:16）または #カテゴリ",
    "profile.myClips": "マイクリップ",
    "profile.signOut": "ログアウト",
    "profile.signIn": "ログイン",
    "profile.createAccount": "アカウント作成",
    "profile.welcome": "BibleClipsへようこそ",
    "profile.submitted": "投稿済み",
    "profile.liked": "いいね",
    "profile.commented": "コメント",
    "profile.noSubmitted": "投稿したクリップがありません",
    "profile.noLiked": "いいねしたクリップがありません",
    "profile.noCommented": "コメントしたクリップがありません",
    "profile.language": "言語",
    "admin.pending": "保留中のクリップ",
    "admin.approve": "承認",
    "admin.reject": "却下",
    "admin.signIn": "管理者アクセスにはログインが必要です",
    "admin.noAccess": "管理者権限が必要です",
    "admin.noPending": "保留中のクリップがありません",
  },
};

const LanguageContext = createContext<LanguageContextType>({
  language: "en",
  setLanguage: () => {},
  t: (key) => key,
});

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<Language>("en");

  useEffect(() => {
    AsyncStorage.getItem("language").then((saved) => {
      if (saved === "en" || saved === "ja") {
        setLanguageState(saved);
      }
    });
  }, []);

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
    AsyncStorage.setItem("language", lang);
  };

  const t = (key: string): string => translations[language][key] || key;

  return <LanguageContext.Provider value={{ language, setLanguage, t }}>{children}</LanguageContext.Provider>;
}

export function useLanguage() {
  return useContext(LanguageContext);
}
