# Subtitle & Verse Style Picker Implementation Plan

> **For Claude:** After human approval, use plan2beads to convert this plan to a beads epic, then use `superpowers:subagent-driven-development` for parallel execution.

**Goal:** Allow users to choose from preset subtitle and verse reference styles, similar to CapCut's text style picker, with categories like "Classic", "Glow", "Bold", and "Minimal".

**Architecture:** Create a style provider that stores user preference in localStorage. Define style presets as TypeScript objects containing CSS properties. Add a style picker modal accessible from the reel viewer. Apply selected styles to SubtitleOverlay and verse reference components.

**Tech Stack:** React Context, localStorage, Tailwind CSS, TypeScript

---

## Task 1: Define Style Preset Types and Data

**Depends on:** None
**Files:**
- Create: `apps/web/lib/styles/subtitle-styles.ts`

**Step 1: Create the styles directory**

```bash
mkdir -p apps/web/lib/styles
```

**Step 2: Write the style preset types and data**

Create `apps/web/lib/styles/subtitle-styles.ts`:

```typescript
export type SubtitleStyleCategory = "classic" | "glow" | "bold" | "minimal";

export type SubtitleStyle = {
  id: string;
  name: string;
  category: SubtitleStyleCategory;
  // Main subtitle text styles
  subtitle: {
    fontWeight: string;
    fontSize: string;
    textTransform: "uppercase" | "lowercase" | "capitalize" | "none";
    letterSpacing: string;
    color: string;
    activeColor: string; // Color for currently spoken word
    textShadow: string;
    backgroundColor?: string;
    padding?: string;
    borderRadius?: string;
  };
  // Verse reference badge styles
  verse: {
    background: string; // Use 'background' instead of 'backgroundColor' to support gradients
    textColor: string;
    fontSize: string;
    fontWeight: string;
    padding: string;
    borderRadius: string;
    boxShadow: string;
  };
  // Translation text styles
  translation: {
    color: string;
    fontSize: string;
    textShadow: string;
  };
};

export const SUBTITLE_STYLES: SubtitleStyle[] = [
  // Classic styles
  {
    id: "classic-white",
    name: "Classic White",
    category: "classic",
    subtitle: {
      fontWeight: "700",
      fontSize: "2.25rem", // text-4xl
      textTransform: "uppercase",
      letterSpacing: "0.05em",
      color: "#ffffff",
      activeColor: "#facc15", // yellow-400
      textShadow: "3px 3px 6px rgba(0,0,0,0.9)",
    },
    verse: {
      background: "#ffffff",
      textColor: "#000000",
      fontSize: "1.5rem",
      fontWeight: "600",
      padding: "0.5rem 2rem",
      borderRadius: "9999px",
      boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.1)",
    },
    translation: {
      color: "rgba(255,255,255,0.8)",
      fontSize: "1.25rem",
      textShadow: "2px 2px 4px rgba(0,0,0,0.9)",
    },
  },
  {
    id: "classic-black",
    name: "Classic Black",
    category: "classic",
    subtitle: {
      fontWeight: "700",
      fontSize: "2.25rem",
      textTransform: "uppercase",
      letterSpacing: "0.05em",
      color: "#ffffff",
      activeColor: "#facc15",
      textShadow: "none",
      backgroundColor: "rgba(0,0,0,0.7)",
      padding: "0.25rem 0.5rem",
      borderRadius: "0.25rem",
    },
    verse: {
      background: "#000000",
      textColor: "#ffffff",
      fontSize: "1.5rem",
      fontWeight: "600",
      padding: "0.5rem 2rem",
      borderRadius: "9999px",
      boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.3)",
    },
    translation: {
      color: "rgba(255,255,255,0.9)",
      fontSize: "1.25rem",
      textShadow: "none",
    },
  },
  // Glow styles
  {
    id: "glow-yellow",
    name: "Yellow Glow",
    category: "glow",
    subtitle: {
      fontWeight: "800",
      fontSize: "2.5rem",
      textTransform: "uppercase",
      letterSpacing: "0.1em",
      color: "#fef08a", // yellow-200
      activeColor: "#ffffff",
      textShadow: "0 0 10px #facc15, 0 0 20px #facc15, 0 0 30px #facc15",
    },
    verse: {
      background: "#facc15",
      textColor: "#000000",
      fontSize: "1.5rem",
      fontWeight: "700",
      padding: "0.5rem 2rem",
      borderRadius: "9999px",
      boxShadow: "0 0 20px rgba(250, 204, 21, 0.5)",
    },
    translation: {
      color: "#fef9c3",
      fontSize: "1.25rem",
      textShadow: "0 0 10px rgba(250, 204, 21, 0.5)",
    },
  },
  {
    id: "glow-cyan",
    name: "Cyan Glow",
    category: "glow",
    subtitle: {
      fontWeight: "800",
      fontSize: "2.5rem",
      textTransform: "uppercase",
      letterSpacing: "0.1em",
      color: "#67e8f9", // cyan-300
      activeColor: "#ffffff",
      textShadow: "0 0 10px #06b6d4, 0 0 20px #06b6d4, 0 0 30px #06b6d4",
    },
    verse: {
      background: "#06b6d4",
      textColor: "#ffffff",
      fontSize: "1.5rem",
      fontWeight: "700",
      padding: "0.5rem 2rem",
      borderRadius: "9999px",
      boxShadow: "0 0 20px rgba(6, 182, 212, 0.5)",
    },
    translation: {
      color: "#cffafe",
      fontSize: "1.25rem",
      textShadow: "0 0 10px rgba(6, 182, 212, 0.5)",
    },
  },
  {
    id: "glow-pink",
    name: "Pink Glow",
    category: "glow",
    subtitle: {
      fontWeight: "800",
      fontSize: "2.5rem",
      textTransform: "uppercase",
      letterSpacing: "0.1em",
      color: "#f9a8d4", // pink-300
      activeColor: "#ffffff",
      textShadow: "0 0 10px #ec4899, 0 0 20px #ec4899, 0 0 30px #ec4899",
    },
    verse: {
      background: "#ec4899",
      textColor: "#ffffff",
      fontSize: "1.5rem",
      fontWeight: "700",
      padding: "0.5rem 2rem",
      borderRadius: "9999px",
      boxShadow: "0 0 20px rgba(236, 72, 153, 0.5)",
    },
    translation: {
      color: "#fce7f3",
      fontSize: "1.25rem",
      textShadow: "0 0 10px rgba(236, 72, 153, 0.5)",
    },
  },
  // Bold styles
  {
    id: "bold-impact",
    name: "Impact",
    category: "bold",
    subtitle: {
      fontWeight: "900",
      fontSize: "3rem",
      textTransform: "uppercase",
      letterSpacing: "0.02em",
      color: "#ffffff",
      activeColor: "#ef4444", // red-500
      textShadow: "4px 4px 0 #000000, -2px -2px 0 #000000",
    },
    verse: {
      background: "#ef4444",
      textColor: "#ffffff",
      fontSize: "1.75rem",
      fontWeight: "900",
      padding: "0.75rem 2.5rem",
      borderRadius: "0",
      boxShadow: "4px 4px 0 #000000",
    },
    translation: {
      color: "#ffffff",
      fontSize: "1.5rem",
      textShadow: "2px 2px 0 #000000",
    },
  },
  {
    id: "bold-gradient",
    name: "Gradient",
    category: "bold",
    subtitle: {
      fontWeight: "900",
      fontSize: "3rem",
      textTransform: "uppercase",
      letterSpacing: "0",
      color: "#ffffff",
      activeColor: "#fbbf24", // amber-400
      textShadow: "2px 2px 4px rgba(0,0,0,0.8)",
    },
    verse: {
      background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
      textColor: "#ffffff",
      fontSize: "1.75rem",
      fontWeight: "800",
      padding: "0.75rem 2.5rem",
      borderRadius: "1rem",
      boxShadow: "0 10px 40px rgba(102, 126, 234, 0.4)",
    },
    translation: {
      color: "#e0e7ff",
      fontSize: "1.5rem",
      textShadow: "2px 2px 4px rgba(0,0,0,0.8)",
    },
  },
  // Minimal styles
  {
    id: "minimal-clean",
    name: "Clean",
    category: "minimal",
    subtitle: {
      fontWeight: "500",
      fontSize: "1.875rem", // text-3xl
      textTransform: "none",
      letterSpacing: "0",
      color: "#ffffff",
      activeColor: "#60a5fa", // blue-400
      textShadow: "1px 1px 3px rgba(0,0,0,0.7)",
    },
    verse: {
      background: "rgba(255,255,255,0.9)",
      textColor: "#1f2937",
      fontSize: "1.125rem",
      fontWeight: "500",
      padding: "0.375rem 1rem",
      borderRadius: "0.5rem",
      boxShadow: "0 4px 6px rgba(0, 0, 0, 0.1)",
    },
    translation: {
      color: "rgba(255,255,255,0.7)",
      fontSize: "1rem",
      textShadow: "1px 1px 2px rgba(0,0,0,0.5)",
    },
  },
  {
    id: "minimal-lowercase",
    name: "Lowercase",
    category: "minimal",
    subtitle: {
      fontWeight: "400",
      fontSize: "1.875rem",
      textTransform: "lowercase",
      letterSpacing: "0.05em",
      color: "#ffffff",
      activeColor: "#a78bfa", // violet-400
      textShadow: "1px 1px 3px rgba(0,0,0,0.7)",
    },
    verse: {
      background: "rgba(0,0,0,0.5)",
      textColor: "#ffffff",
      fontSize: "1rem",
      fontWeight: "400",
      padding: "0.375rem 1rem",
      borderRadius: "0.25rem",
      boxShadow: "none",
    },
    translation: {
      color: "rgba(255,255,255,0.6)",
      fontSize: "0.875rem",
      textShadow: "1px 1px 2px rgba(0,0,0,0.5)",
    },
  },
];

export const STYLE_CATEGORIES: { id: SubtitleStyleCategory; name: string; nameJa: string }[] = [
  { id: "classic", name: "Classic", nameJa: "クラシック" },
  { id: "glow", name: "Glow", nameJa: "グロー" },
  { id: "bold", name: "Bold", nameJa: "ボールド" },
  { id: "minimal", name: "Minimal", nameJa: "ミニマル" },
];

export function getStyleById(id: string): SubtitleStyle | undefined {
  return SUBTITLE_STYLES.find((s) => s.id === id);
}

export function getStylesByCategory(category: SubtitleStyleCategory): SubtitleStyle[] {
  return SUBTITLE_STYLES.filter((s) => s.category === category);
}

export const DEFAULT_STYLE_ID = "classic-white";
```

**Step 3: Commit**

```bash
git add apps/web/lib/styles/subtitle-styles.ts
git commit -m "feat: add subtitle style preset types and data"
```

---

## Task 2: Create Style Provider Context

**Depends on:** Task 1
**Files:**
- Create: `apps/web/components/providers/style-provider.tsx`
- Modify: `apps/web/app/layout.tsx`

**Step 1: Create the style provider**

Create `apps/web/components/providers/style-provider.tsx`:

```typescript
"use client";

import { createContext, type ReactNode, useContext, useEffect, useState } from "react";
import {
  DEFAULT_STYLE_ID,
  getStyleById,
  type SubtitleStyle,
  SUBTITLE_STYLES,
} from "@/lib/styles/subtitle-styles";

type StyleContextType = {
  style: SubtitleStyle;
  styleId: string;
  setStyleId: (id: string) => void;
};

const StyleContext = createContext<StyleContextType | undefined>(undefined);

export function StyleProvider({ children }: { children: ReactNode }) {
  const [styleId, setStyleIdState] = useState<string>(DEFAULT_STYLE_ID);

  useEffect(() => {
    const saved = localStorage.getItem("subtitleStyle");
    if (saved && getStyleById(saved)) {
      setStyleIdState(saved);
    }
  }, []);

  const setStyleId = (id: string) => {
    if (getStyleById(id)) {
      setStyleIdState(id);
      localStorage.setItem("subtitleStyle", id);
    }
  };

  const style = getStyleById(styleId) ?? SUBTITLE_STYLES[0]!;

  return (
    <StyleContext.Provider value={{ style, styleId, setStyleId }}>
      {children}
    </StyleContext.Provider>
  );
}

export function useStyle() {
  const context = useContext(StyleContext);
  if (!context) {
    throw new Error("useStyle must be used within a StyleProvider");
  }
  return context;
}
```

**Step 2: Add StyleProvider to app layout**

Modify `apps/web/app/layout.tsx`:

1. Add import at top:
```typescript
import { StyleProvider } from "@/components/providers/style-provider";
```

2. Update the return statement to wrap LanguageProvider's children:
```typescript
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <SupabaseProvider>
          <LanguageProvider>
            <StyleProvider>{children}</StyleProvider>
          </LanguageProvider>
        </SupabaseProvider>
      </body>
    </html>
  );
}
```

**Step 3: Commit**

```bash
git add apps/web/components/providers/style-provider.tsx apps/web/app/layout.tsx
git commit -m "feat: add style provider for subtitle preferences"
```

---

## Task 3: Create Style Preview Component

**Depends on:** Task 1
**Files:**
- Create: `apps/web/components/style-picker/style-preview.tsx`

**Step 1: Create the style picker directory**

```bash
mkdir -p apps/web/components/style-picker
```

**Step 2: Create the style preview component**

Create `apps/web/components/style-picker/style-preview.tsx`:

```typescript
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
```

**Step 3: Commit**

```bash
git add apps/web/components/style-picker/style-preview.tsx
git commit -m "feat: add style preview thumbnail component"
```

---

## Task 4: Create Style Picker Modal

**Depends on:** Task 2, Task 3
**Files:**
- Create: `apps/web/components/style-picker/style-picker-modal.tsx`

**Step 1: Create the style picker modal**

Create `apps/web/components/style-picker/style-picker-modal.tsx`:

```typescript
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
```

**Step 2: Commit**

```bash
git add apps/web/components/style-picker/style-picker-modal.tsx
git commit -m "feat: add style picker modal with category tabs"
```

---

## Task 5: Add Style Button to Action Buttons

**Depends on:** Task 4
**Files:**
- Modify: `apps/web/components/reel/action-buttons.tsx`

**Step 1: Read the current action-buttons.tsx to understand its structure**

**Step 2: Add style button and state**

Add a new "style" button to the ActionButtons component. The button should:
- Show a paint/style icon
- Call `onStyleClick` callback when pressed

Add the style icon and button to the component (insert before or after the share button):

```typescript
// Add to props type:
onStyleClick: () => void;

// Add the style icon component:
const StyleIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M12 2L2 7l10 5 10-5-10-5z" />
    <path d="M2 17l10 5 10-5" />
    <path d="M2 12l10 5 10-5" />
  </svg>
);

// Add the button in the buttons list:
<button
  type="button"
  onClick={onStyleClick}
  className="flex flex-col items-center text-white"
>
  <div className="w-10 h-10 bg-white/20 hover:bg-white/30 rounded-full flex items-center justify-center transition-colors">
    <StyleIcon />
  </div>
  <span className="text-xs mt-1">Style</span>
</button>
```

**Step 3: Commit**

```bash
git add apps/web/components/reel/action-buttons.tsx
git commit -m "feat: add style button to action buttons"
```

---

## Task 6: Update ReelViewer to Include Style Picker

**Depends on:** Task 5
**Files:**
- Modify: `apps/web/components/reel/reel-viewer.tsx`

**Step 1: Import StylePickerModal and add state**

Add to imports:
```typescript
import { StylePickerModal } from "@/components/style-picker/style-picker-modal";
```

Add state:
```typescript
const [showStylePicker, setShowStylePicker] = useState(false);
```

**Step 2: Update ReelCard props and ActionButtons calls**

Add `onStyleClick` prop to ReelCard and pass it to ActionButtons:

```typescript
// In ReelCard props:
onStyleClick: () => void;

// In ReelCard's ActionButtons:
onStyleClick={onStyleClick}

// In ReelViewer's ReelCard usage:
onStyleClick={() => setShowStylePicker(true)}

// In ReelViewer's desktop ActionButtons:
onStyleClick={() => setShowStylePicker(true)}
```

**Step 3: Render StylePickerModal**

Add after the CommentSection rendering:

```typescript
{/* Style Picker Modal */}
{showStylePicker && (
  <StylePickerModal onClose={() => setShowStylePicker(false)} />
)}
```

**Step 4: Commit**

```bash
git add apps/web/components/reel/reel-viewer.tsx
git commit -m "feat: integrate style picker modal into reel viewer"
```

---

## Task 7: Update SubtitleOverlay to Use Style

**Depends on:** Task 2
**Files:**
- Modify: `apps/web/components/reel/subtitle-overlay.tsx`

**Step 1: Import useStyle hook**

```typescript
import { useStyle } from "@/components/providers/style-provider";
```

**Step 2: Use style in component**

Get the style at the top of the component:
```typescript
const { style } = useStyle();
```

**Step 3: Apply styles to subtitle words**

Replace the hardcoded styles in the word spans with dynamic styles from the style object:

```typescript
<span
  key={index}
  style={{
    fontWeight: style.subtitle.fontWeight,
    fontSize: style.subtitle.fontSize,
    textTransform: style.subtitle.textTransform,
    letterSpacing: style.subtitle.letterSpacing,
    color: index === activeWordIndex ? style.subtitle.activeColor : style.subtitle.color,
    textShadow: style.subtitle.textShadow,
    backgroundColor: style.subtitle.backgroundColor,
    padding: style.subtitle.padding,
    borderRadius: style.subtitle.borderRadius,
    transform: index === activeWordIndex ? "scale(1.15)" : "scale(1)",
    transition: "all 75ms",
  }}
>
  {wordObj.word}
</span>
```

**Step 4: Apply styles to translation**

Update the translation div:
```typescript
<div
  style={{
    color: style.translation.color,
    fontSize: style.translation.fontSize,
    textShadow: style.translation.textShadow,
    marginTop: "0.5rem",
  }}
>
  ({translatedSentence})
</div>
```

**Step 5: Commit**

```bash
git add apps/web/components/reel/subtitle-overlay.tsx
git commit -m "feat: apply dynamic styles to subtitle overlay"
```

---

## Task 8: Update Verse Reference to Use Style

**Depends on:** Task 2
**Files:**
- Modify: `apps/web/components/reel/reel-viewer.tsx`

**Step 1: Import useStyle in reel-viewer.tsx**

If not already imported:
```typescript
import { useStyle } from "@/components/providers/style-provider";
```

**Step 2: Get style in ReelCard component**

```typescript
const { style } = useStyle();
```

**Step 3: Apply verse styles to the verse reference badge**

Update the verse reference `<a>` tag styles:

```typescript
<a
  href={bibleGatewayUrl}
  target="_blank"
  rel="noopener noreferrer"
  style={{
    background: style.verse.background,
    color: style.verse.textColor,
    fontSize: style.verse.fontSize,
    fontWeight: style.verse.fontWeight,
    padding: style.verse.padding,
    borderRadius: style.verse.borderRadius,
    boxShadow: style.verse.boxShadow,
  }}
  className="hover:opacity-90 transition-opacity"
>
  {verseRef}
</a>
```

**Step 4: Commit**

```bash
git add apps/web/components/reel/reel-viewer.tsx
git commit -m "feat: apply dynamic styles to verse reference badge"
```

---

## Task 9: Create Index Export for Style Picker

**Depends on:** Task 4
**Files:**
- Create: `apps/web/components/style-picker/index.ts`

**Step 1: Create the index file**

Create `apps/web/components/style-picker/index.ts`:

```typescript
export { StylePickerModal } from "./style-picker-modal";
export { StylePreview } from "./style-preview";
```

**Step 2: Commit**

```bash
git add apps/web/components/style-picker/index.ts
git commit -m "chore: add index export for style picker components"
```

---

## Task 10: Verification Gate

**Depends on:** Task 1, Task 2, Task 3, Task 4, Task 5, Task 6, Task 7, Task 8, Task 9
**Files:**
- Test: All files

## Verification Gate

This task verifies the epic implementation is complete and meets quality standards.

**Do not close this task until ALL criteria are met.**

## Final Checks

1. `pnpm lint` runs without errors
2. `pnpm build` succeeds
3. `pnpm type-check` passes
4. Style picker modal opens from action button
5. Style selection persists in localStorage
6. Subtitle and verse styles update when selection changes
7. All 4 style categories display correctly

---

## Verification Record

### Plan Verification Checklist
| Check | Status | Notes |
|-------|--------|-------|
| Complete | ✓ | All requirements from user request addressed - style categories, previews, subtitle and verse styling |
| Accurate | ✓ | File paths verified via Glob - all target files exist |
| Commands valid | ✓ | Standard git commands, mkdir |
| YAGNI | ✓ | No unnecessary features - focused on style selection only |
| Minimal | ✓ | 10 tasks, no bloat |
| Not over-engineered | ✓ | Uses existing patterns (localStorage, Context) from language-provider |

### Rule-of-Five Passes
| Pass | Changes Made |
|------|--------------|
| Draft | Initial structure with 10 tasks, 9 styles across 4 categories |
| Correctness | Changed `backgroundColor` to `background` in verse styles to support gradients |
| Clarity | Added complete layout.tsx code showing exact provider nesting |
| Edge Cases | Verified SSR safety (useEffect pattern), button types, style degradation |
| Excellence | Updated verification record, verified all code blocks complete |
