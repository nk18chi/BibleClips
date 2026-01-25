"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useLanguage } from "@/components/providers/language-provider";
import { useSupabase } from "@/components/providers/supabase-provider";
import { useUserProfile } from "@/hooks/use-user-profile";

export function Header() {
  const { supabase, user, canAccessWorkspace } = useSupabase();
  const { isAdmin } = useUserProfile();
  const { language, setLanguage, t } = useLanguage();
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState("");
  const [showSearch, setShowSearch] = useState(false);
  const [showLanguageMenu, setShowLanguageMenu] = useState(false);
  const [showMobileMenu, setShowMobileMenu] = useState(false);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;

    // Check if it's a verse reference (e.g., "John 3:16")
    const verseMatch = searchQuery.match(/^(\d?\s*\w+)\s+(\d+):(\d+)(?:-(\d+))?$/i);
    if (verseMatch?.[1] && verseMatch[2] && verseMatch[3]) {
      const book = verseMatch[1].toLowerCase().replace(/\s+/g, "-");
      const chapter = verseMatch[2];
      const verse = verseMatch[3];
      router.push(`/verse/${book}/${chapter}/${verse}`);
    } else {
      // Search as hashtag/category
      const slug = searchQuery.toLowerCase().replace(/^#/, "").trim();
      router.push(`/category/${slug}`);
    }
    setSearchQuery("");
    setShowSearch(false);
  };

  return (
    <header className="sticky top-0 z-50 bg-white border-b border-gray-200 relative">
      <div className="max-w-7xl mx-auto px-4 h-14 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2 text-xl font-bold text-blue-600">
          <svg width="32" height="32" viewBox="0 0 1024 1024" xmlns="http://www.w3.org/2000/svg" className="rounded-lg">
            <defs>
              <clipPath id="roundedCorners">
                <rect width="1024" height="1024" rx="140" ry="140" />
              </clipPath>
            </defs>
            <g clipPath="url(#roundedCorners)">
              <path
                fill="#008BD2"
                d="M669,1025C446,1025,223.5,1025,1,1025C1,683.667,1,342.333,1,1C342.333,1,683.667,1,1025,1C1025,342.333,1025,683.667,1025,1025C906.5,1025,788,1025,669,1025M297.501,822.908C382.661,822.847,467.821,822.895,552.98,822.607C565.765,822.563,578.74,822.058,591.294,819.86C655.953,808.535,701.252,772.27,726.383,711.687C738.43,682.645,740.445,651.871,737.841,620.788C734.498,580.883,719.116,546.476,689.938,518.718C683.472,512.566,676.137,507.327,669.208,501.672C669.293,501.504,669.33,501.326,669.44,501.23C670.818,500.027,672.197,498.824,673.593,497.642C694.841,479.639,709.897,457.528,718.228,430.864C725.958,406.126,727.528,380.838,725.039,355.23C720.666,310.241,701.898,272.438,667.173,243.262C635.47,216.626,598.434,203.83,557.094,203.789C465.601,203.7,374.107,203.774,282.614,203.799C281.198,203.8,279.782,204.028,278.36,204.151C278.36,410.545,278.36,616.462,278.36,822.909C284.604,822.909,290.552,822.909,297.501,822.908z"
              />
              <path
                fill="#FDFDFD"
                d="M297.001,822.908C290.552,822.909,284.604,822.909,278.36,822.909C278.36,616.462,278.36,410.545,278.36,204.151C279.782,204.028,281.198,203.8,282.614,203.799C374.107,203.774,465.601,203.7,557.094,203.789C598.434,203.83,635.47,216.626,667.173,243.262C701.898,272.438,720.666,310.241,725.039,355.23C727.528,380.838,725.958,406.126,718.228,430.864C709.897,457.528,694.841,479.639,673.593,497.642C672.197,498.824,670.818,500.027,669.44,501.23C669.33,501.326,669.293,501.504,669.208,501.672C676.137,507.327,683.472,512.566,689.938,518.718C719.116,546.476,734.498,580.883,737.841,620.788C740.445,651.871,738.43,682.645,726.383,711.687C701.252,772.27,655.953,808.535,591.294,819.86C578.74,822.058,565.765,822.563,552.98,822.607C467.821,822.895,382.661,822.847,297.001,822.908M600.358,447.139C592.259,442.755,584.16,438.371,575.577,433.726C595.091,422.759,603.012,405.719,603.412,384.888C603.806,364.361,598.086,346.307,579.724,334.443C569.018,327.526,557.049,325.087,544.492,325.082C496.996,325.06,449.5,325.074,402.004,325.094C400.736,325.095,399.467,325.32,398.09,325.451C398.09,450.399,398.09,574.991,398.09,699.785C398.922,699.909,399.548,700.086,400.174,700.085C453.336,700.057,506.499,700.206,559.658,699.856C575.285,699.753,589.45,694.475,600.938,683.431C618.834,666.228,622.696,632.878,609.766,609.544C604.844,600.659,597.977,593.675,588.963,588.109C591.066,586.825,592.629,585.935,594.126,584.947C605.794,577.247,618.113,570.357,628.981,561.656C659.747,537.025,659.658,489.484,628.887,464.956C620.367,458.164,610.334,453.272,600.358,447.139z"
              />
              <path
                fill="#018AD0"
                d="M600.677,447.324C610.334,453.272,620.367,458.164,628.887,464.956C659.658,489.484,659.747,537.025,628.981,561.656C618.113,570.357,605.794,577.247,594.126,584.947C592.629,585.935,591.066,586.825,588.963,588.109C597.977,593.675,604.844,600.659,609.766,609.544C622.696,632.878,618.834,666.228,600.938,683.431C589.45,694.475,575.285,699.753,559.658,699.856C506.499,700.206,453.336,700.057,400.174,700.085C399.548,700.086,398.922,699.909,398.09,699.785C398.09,574.991,398.09,450.399,398.09,325.451C399.467,325.32,400.736,325.095,402.004,325.094C449.5,325.074,496.996,325.06,544.492,325.082C557.049,325.087,569.018,327.526,579.724,334.443C598.086,346.307,603.806,364.361,603.412,384.888C603.012,405.719,595.091,422.759,575.577,433.726C584.16,438.371,592.259,442.755,600.677,447.324M598.155,530.739C612.083,520.846,611.793,504.336,597.548,496.12C556.173,472.256,514.795,448.398,473.425,424.525C457.493,415.331,441.577,424.341,441.566,442.655C441.535,490.63,441.554,538.605,441.575,586.581C441.576,588.407,441.652,590.26,441.962,592.054C444.08,604.341,455.134,611.492,466.677,607.893C469.33,607.066,471.798,605.526,474.221,604.093C515.332,579.78,556.422,555.431,598.155,530.739z"
              />
              <path
                fill="#FDFEFE"
                d="M597.836,530.915C556.422,555.431,515.332,579.78,474.221,604.093C471.798,605.526,469.33,607.066,466.677,607.893C455.134,611.492,444.08,604.341,441.962,592.054C441.652,590.26,441.576,588.407,441.575,586.581C441.554,538.605,441.535,490.63,441.566,442.655C441.577,424.341,457.493,415.331,473.425,424.525C514.795,448.398,556.173,472.256,597.548,496.12C611.793,504.336,612.083,520.846,597.836,530.915z"
              />
            </g>
          </svg>
          BibleClips
        </Link>

        <div className="flex items-center gap-3">
          {/* Search */}
          {showSearch ? (
            <form onSubmit={handleSearch} className="flex items-center gap-2">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="John 3:16 or #anxiety"
                className="w-40 sm:w-56 px-3 py-1.5 text-sm border border-gray-300 rounded-full focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button type="button" onClick={() => setShowSearch(false)} className="text-gray-500 hover:text-gray-700">
                Cancel
              </button>
            </form>
          ) : (
            <button
              onClick={() => setShowSearch(true)}
              className="p-2 text-gray-600 hover:text-gray-900"
              aria-label="Search"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                />
              </svg>
            </button>
          )}

          {/* Language Switcher Dropdown */}
          <div className="relative">
            <button
              onClick={() => setShowLanguageMenu(!showLanguageMenu)}
              className="flex items-center gap-1.5 text-sm text-gray-600 hover:text-gray-900 font-medium px-2 py-1.5 rounded hover:bg-gray-50"
            >
              <span className="text-base">{language === "en" ? "🇺🇸" : "🇯🇵"}</span>
              <svg
                className={`w-3 h-3 transition-transform ${showLanguageMenu ? "rotate-180" : ""}`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            {showLanguageMenu && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setShowLanguageMenu(false)} />
                <div className="absolute right-0 mt-1 w-36 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-50">
                  <button
                    onClick={() => {
                      setLanguage("en");
                      setShowLanguageMenu(false);
                    }}
                    className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
                  >
                    <span className="text-base">🇺🇸</span>
                    <span>English</span>
                    {language === "en" && <span className="ml-auto text-green-500">✓</span>}
                  </button>
                  <button
                    onClick={() => {
                      setLanguage("ja");
                      setShowLanguageMenu(false);
                    }}
                    className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
                  >
                    <span className="text-base">🇯🇵</span>
                    <span>日本語</span>
                    {language === "ja" && <span className="ml-auto text-green-500">✓</span>}
                  </button>
                </div>
              </>
            )}
          </div>

          {user ? (
            <>
              {isAdmin && (
                <Link href="/admin/pending" className="text-sm text-gray-600 hover:text-gray-900 hidden sm:block">
                  {t("header.admin")}
                </Link>
              )}
              {canAccessWorkspace && (
                <Link href="/workspace" className="text-sm text-gray-600 hover:text-gray-900 hidden sm:block">
                  {t("header.workspace")}
                </Link>
              )}
              <Link href="/submit" className="p-2 text-gray-600 hover:text-gray-900" aria-label="Submit clip">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
              </Link>
              <Link href="/my-clips" className="text-sm text-gray-600 hover:text-gray-900 hidden sm:block">
                {t("header.myClips")}
              </Link>
              {/* Mobile menu button - only show when user is logged in */}
              <button
                onClick={() => setShowMobileMenu(!showMobileMenu)}
                className="p-2 text-gray-600 hover:text-gray-900 sm:hidden"
                aria-label="Menu"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              </button>
              <button onClick={handleSignOut} className="text-sm text-gray-600 hover:text-gray-900 hidden sm:block">
                {t("header.signOut")}
              </button>
            </>
          ) : (
            <Link href="/login" className="text-sm bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700">
              {t("header.signIn")}
            </Link>
          )}
        </div>
      </div>
      {/* Mobile menu dropdown */}
      {showMobileMenu && user && (
        <>
          <div className="fixed inset-0 z-40 sm:hidden" onClick={() => setShowMobileMenu(false)} />
          <div className="absolute top-full left-0 right-0 bg-white border-b border-gray-200 shadow-lg z-50 sm:hidden">
            <div className="px-4 py-3 space-y-3">
              {canAccessWorkspace && (
                <Link
                  href="/workspace"
                  className="block text-sm text-gray-700 hover:text-gray-900"
                  onClick={() => setShowMobileMenu(false)}
                >
                  {t("header.workspace")}
                </Link>
              )}
              {isAdmin && (
                <Link
                  href="/admin/pending"
                  className="block text-sm text-gray-700 hover:text-gray-900"
                  onClick={() => setShowMobileMenu(false)}
                >
                  {t("header.admin")}
                </Link>
              )}
              <Link
                href="/my-clips"
                className="block text-sm text-gray-700 hover:text-gray-900"
                onClick={() => setShowMobileMenu(false)}
              >
                {t("header.myClips")}
              </Link>
              <button
                onClick={() => {
                  handleSignOut();
                  setShowMobileMenu(false);
                }}
                className="block w-full text-left text-sm text-gray-700 hover:text-gray-900"
              >
                {t("header.signOut")}
              </button>
            </div>
          </div>
        </>
      )}
    </header>
  );
}
