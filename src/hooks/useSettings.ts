import { useState, useEffect, useCallback } from "react";
import type { EulerConfig } from "../types";
import { getSettings, saveSettings } from "../lib/tauri-commands";
import { DEFAULT_CODE_FONT, DEFAULT_UI_FONT, normalizeStoredFontName } from "../styles/fonts";

const DEFAULT_SETTINGS: EulerConfig = {
  compiler: "pdflatex",
  auto_save: true,
  theme: "vercel-dark",
  ui_font: DEFAULT_UI_FONT,
  code_font: DEFAULT_CODE_FONT,
  debounce_ms: 1000,
  vim_mode: false,
  relative_line_numbers: false,
  show_line_numbers: true,
};

interface UseSettingsReturn {
  settings: EulerConfig;
  updateSettings: (partial: Partial<EulerConfig>) => Promise<void>;
  isLoaded: boolean;
}

export function useSettings(): UseSettingsReturn {
  const [settings, setSettings] = useState<EulerConfig>(DEFAULT_SETTINGS);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const loaded = await getSettings();
        if (!cancelled) {
          const merged: EulerConfig = {
            ...DEFAULT_SETTINGS,
            ...loaded,
            ui_font: normalizeStoredFontName(loaded.ui_font, "ui"),
            code_font: normalizeStoredFontName(loaded.code_font, "code"),
          };
          setSettings(merged);
          setIsLoaded(true);

          // Persist migration of older config font identifiers.
          if (merged.ui_font !== loaded.ui_font || merged.code_font !== loaded.code_font) {
            saveSettings(merged).catch(() => {});
          }
        }
      } catch {
        // Tauri command not available (e.g., in dev mode without backend).
        // Fall back to defaults.
        if (!cancelled) {
          setIsLoaded(true);
        }
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, []);

  const updateSettings = useCallback(
    async (partial: Partial<EulerConfig>) => {
      const merged: EulerConfig = {
        ...settings,
        ...partial,
        ui_font: normalizeStoredFontName((partial.ui_font ?? settings.ui_font), "ui"),
        code_font: normalizeStoredFontName((partial.code_font ?? settings.code_font), "code"),
      };
      setSettings(merged);

      try {
        await saveSettings(merged);
      } catch {
        // Silently fail if backend is unavailable
      }
    },
    [settings]
  );

  return { settings, updateSettings, isLoaded };
}
