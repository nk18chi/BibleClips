"use client";

import { useState } from "react";
import { useLanguage } from "@/components/providers/language-provider";
import { useStyle } from "@/components/providers/style-provider";
import {
  getStylesByCategory,
  STYLE_CATEGORIES,
  type SubtitleStyleCategory,
} from "@/lib/styles/subtitle-styles";
import { StylePreview } from "./style-preview";

type StylePickerModalProps = {
  onClose: () => void;
};

export function StylePickerModal({ onClose }: StylePickerModalProps) {
  const { language } = useLanguage();
  const { styleId, setStyleId } = useStyle();
  const [activeCategory, setActiveCategory] = useState<SubtitleStyleCategory>("classic");

  const handleStyleSelect = (id: string) => {
    setStyleId(id);
  };

  const styles = getStylesByCategory(activeCategory);

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-black/50" onClick={onClose}>
      <div className="flex-1" />
      <div
        className="bg-white rounded-t-2xl max-h-[80vh] flex flex-col animate-slide-up"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold">
            {language === "ja" ? "スタイルを選択" : "Choose Style"}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="p-1 text-gray-400 hover:text-gray-600 transition-colors"
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {/* Category tabs */}
        <div className="flex border-b border-gray-200 px-4 overflow-x-auto">
          {STYLE_CATEGORIES.map((cat) => (
            <button
              key={cat.id}
              type="button"
              onClick={() => setActiveCategory(cat.id)}
              className={`px-4 py-3 text-sm font-medium whitespace-nowrap transition-colors ${
                activeCategory === cat.id
                  ? "text-blue-600 border-b-2 border-blue-600"
                  : "text-gray-500 hover:text-gray-700"
              }`}
            >
              {language === "ja" ? cat.nameJa : cat.name}
            </button>
          ))}
        </div>

        {/* Style grid */}
        <div className="flex-1 overflow-y-auto p-4">
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {styles.map((style) => (
              <StylePreview
                key={style.id}
                style={style}
                isSelected={styleId === style.id}
                onClick={() => handleStyleSelect(style.id)}
              />
            ))}
          </div>
        </div>
      </div>

      <style jsx>{`
        @keyframes slide-up {
          from {
            transform: translateY(100%);
          }
          to {
            transform: translateY(0);
          }
        }
        .animate-slide-up {
          animation: slide-up 0.3s ease-out;
        }
      `}</style>
    </div>
  );
}
