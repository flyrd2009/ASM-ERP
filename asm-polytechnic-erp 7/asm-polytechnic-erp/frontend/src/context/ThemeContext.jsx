import { createContext, useContext, useEffect, useState } from "react";
import { THEMES, DEFAULT_THEME_ID, getTheme } from "../theme";

const ThemeContext = createContext(null);
const STORAGE_KEY = "asm_erp_theme";

export function ThemeProvider({ children }) {
  const [themeId, setThemeId] = useState(() => {
    try {
      return localStorage.getItem(STORAGE_KEY) || DEFAULT_THEME_ID;
    } catch {
      return DEFAULT_THEME_ID;
    }
  });

  useEffect(() => {
    const theme = getTheme(themeId);
    document.documentElement.style.setProperty("--brand-primary", theme.primary);
    document.documentElement.style.setProperty("--brand-primary-dark", theme.primaryDark);
    try {
      localStorage.setItem(STORAGE_KEY, themeId);
    } catch {
      // storage unavailable (private browsing, etc.) — theme just won't persist
    }
  }, [themeId]);

  return (
    <ThemeContext.Provider value={{ themeId, setThemeId, themes: THEMES }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}
