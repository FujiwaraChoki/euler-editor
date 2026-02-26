import type { Theme } from "../types";

export const DEFAULT_DARK_THEME: Theme = {
  name: "vercel-dark",
  displayName: "Vercel Dark",
  colors: {
    bgPrimary: "#0a0a0a",
    bgSecondary: "#111111",
    bgTertiary: "#1a1a1a",
    border: "#2e2e2e",
    textPrimary: "#ededed",
    textSecondary: "#a1a1a1",
    textMuted: "#666666",
    accent: "#ffffff",
    error: "#ff6369",
    success: "#50e3c2",
    warning: "#f5a623",
  },
};

export function applyTheme(theme: Theme) {
  const root = document.documentElement;
  const { colors } = theme;
  root.style.setProperty("--bg-primary", colors.bgPrimary);
  root.style.setProperty("--bg-secondary", colors.bgSecondary);
  root.style.setProperty("--bg-tertiary", colors.bgTertiary);
  root.style.setProperty("--border", colors.border);
  root.style.setProperty("--text-primary", colors.textPrimary);
  root.style.setProperty("--text-secondary", colors.textSecondary);
  root.style.setProperty("--text-muted", colors.textMuted);
  root.style.setProperty("--accent", colors.accent);
  root.style.setProperty("--error", colors.error);
  root.style.setProperty("--success", colors.success);
  root.style.setProperty("--warning", colors.warning);
}
