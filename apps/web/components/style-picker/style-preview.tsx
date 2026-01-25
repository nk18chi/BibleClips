"use client";

import type { SubtitleStyle } from "@/lib/styles/subtitle-styles";

type StylePreviewProps = {
  style: SubtitleStyle;
  isSelected: boolean;
  onClick: () => void;
};

export function StylePreview({ style, isSelected, onClick }: StylePreviewProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`relative w-full aspect-video rounded-lg overflow-hidden bg-gray-900 transition-all ${
        isSelected ? "ring-2 ring-blue-500 ring-offset-2 ring-offset-white" : "hover:ring-1 hover:ring-gray-400"
      }`}
    >
      {/* Preview background */}
      <div className="absolute inset-0 bg-gradient-to-b from-gray-800 to-gray-900" />

      {/* Sample verse badge */}
      <div className="absolute top-2 left-1/2 -translate-x-1/2">
        <span
          style={{
            background: style.verse.background,
            color: style.verse.textColor,
            fontSize: "0.5rem",
            fontWeight: style.verse.fontWeight,
            padding: "0.125rem 0.5rem",
            borderRadius: style.verse.borderRadius,
            boxShadow: style.verse.boxShadow,
          }}
        >
          John 3:16
        </span>
      </div>

      {/* Sample subtitle text */}
      <div className="absolute bottom-3 left-0 right-0 flex flex-col items-center px-2">
        <div className="flex gap-1 justify-center flex-wrap">
          {["For", "God"].map((word, i) => (
            <span
              key={word}
              style={{
                fontWeight: style.subtitle.fontWeight,
                fontSize: "0.625rem",
                textTransform: style.subtitle.textTransform,
                letterSpacing: style.subtitle.letterSpacing,
                color: i === 1 ? style.subtitle.activeColor : style.subtitle.color,
                textShadow: style.subtitle.textShadow,
                backgroundColor: style.subtitle.backgroundColor,
                padding: style.subtitle.padding,
                borderRadius: style.subtitle.borderRadius,
              }}
            >
              {word}
            </span>
          ))}
        </div>
        <span
          style={{
            color: style.translation.color,
            fontSize: "0.5rem",
            textShadow: style.translation.textShadow,
            marginTop: "0.125rem",
          }}
        >
          (神は)
        </span>
      </div>

      {/* Style name */}
      <div className="absolute bottom-0 left-0 right-0 bg-black/60 py-1 px-2">
        <p className="text-white text-xs truncate text-center">{style.name}</p>
      </div>
    </button>
  );
}
