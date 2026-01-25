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
