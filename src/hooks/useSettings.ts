import { useState, useEffect, useCallback } from "react";
import type { EulerConfig } from "../types";
import { getSettings, saveSettings } from "../lib/tauri-commands";

const DEFAULT_SETTINGS: EulerConfig = {
  compiler: "pdflatex",
  auto_save: true,
  theme: "default-dark",
  debounce_ms: 1000,
  vim_mode: false,
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
          setSettings(loaded);
          setIsLoaded(true);
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
      const merged: EulerConfig = { ...settings, ...partial };
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
