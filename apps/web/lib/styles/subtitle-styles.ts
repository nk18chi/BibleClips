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
