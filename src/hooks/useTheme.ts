import { useState, useEffect, useCallback } from "react";
import type { Theme } from "../types";
import { DEFAULT_DARK_THEME, applyTheme } from "../styles/themes";
import { createMonacoTheme } from "../styles/monaco-theme";
import { getThemes, getTheme } from "../lib/tauri-commands";
import { loader } from "@monaco-editor/react";

const EULER_MONACO_THEME = "euler-theme";

interface UseThemeReturn {
  themes: Theme[];
  currentTheme: Theme;
  setTheme: (themeName: string) => Promise<void>;
}

export function useTheme(): UseThemeReturn {
  const [themes, setThemes] = useState<Theme[]>([DEFAULT_DARK_THEME]);
  const [currentTheme, setCurrentTheme] = useState<Theme>(DEFAULT_DARK_THEME);

  // Apply the theme to CSS variables and register with Monaco
  const applyAndRegister = useCallback((theme: Theme) => {
    applyTheme(theme);

    // Register Monaco theme asynchronously
    loader.init().then((monaco) => {
      const monacoThemeData = createMonacoTheme(theme.colors);
      monaco.editor.defineTheme(EULER_MONACO_THEME, monacoThemeData);
    }).catch(() => {
      // Monaco not yet available, will be set on editor mount
    });
  }, []);

  // Load themes list on mount
  useEffect(() => {
    let cancelled = false;

    async function loadThemes() {
      try {
        const loadedThemes = await getThemes();
        if (!cancelled && loadedThemes.length > 0) {
          setThemes(loadedThemes);
        }
      } catch {
        // Backend unavailable, use default
      }
    }

    loadThemes();
    return () => {
      cancelled = true;
    };
  }, []);

  // Apply the default theme on mount
  useEffect(() => {
    applyAndRegister(currentTheme);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const setTheme = useCallback(
    async (themeName: string) => {
      // Check if it's the built-in default
      if (themeName === DEFAULT_DARK_THEME.name) {
        setCurrentTheme(DEFAULT_DARK_THEME);
        applyAndRegister(DEFAULT_DARK_THEME);
        return;
      }

      // Check loaded themes list first
      const found = themes.find((t) => t.name === themeName);
      if (found) {
        setCurrentTheme(found);
        applyAndRegister(found);
        return;
      }

      // Try loading from backend
      try {
        const loaded = await getTheme(themeName);
        if (loaded) {
          const theme: Theme = loaded;
          setCurrentTheme(theme);
          applyAndRegister(theme);
        }
      } catch {
        // Theme not found, keep current
      }
    },
    [themes, applyAndRegister]
  );

  return { themes, currentTheme, setTheme };
}

export { EULER_MONACO_THEME };
