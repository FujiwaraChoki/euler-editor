import type { editor } from "monaco-editor";
import type { ThemeColors } from "../types";

function isLightBackground(hex: string): boolean {
  const c = hex.replace("#", "");
  const r = parseInt(c.substring(0, 2), 16);
  const g = parseInt(c.substring(2, 4), 16);
  const b = parseInt(c.substring(4, 6), 16);
  return (0.299 * r + 0.587 * g + 0.114 * b) / 255 > 0.5;
}

export function createMonacoTheme(colors: ThemeColors): editor.IStandaloneThemeData {
  const light = isLightBackground(colors.bgPrimary);

  return {
    base: light ? "vs" : "vs-dark",
    inherit: false,
    rules: [
      { token: "", foreground: colors.textPrimary.slice(1) },
      { token: "comment", foreground: colors.textMuted.slice(1), fontStyle: "italic" },
      { token: "keyword", foreground: light ? "7820bc" : "c084fc" },
      { token: "keyword.predefined", foreground: light ? "0068d6" : "60a5fa" },
      { token: "keyword.at", foreground: light ? "7820bc" : "c084fc" },
      { token: "tag", foreground: light ? "bd2864" : "f472b6" },
      { token: "number.arg", foreground: colors.success.slice(1) },
      { token: "number.len", foreground: colors.success.slice(1) },
      { token: "string", foreground: light ? "0f8033" : "fbbf24" },
      { token: "string.escape", foreground: light ? "0f8033" : "fbbf24" },
      { token: "delimiter", foreground: colors.textSecondary.slice(1) },
      { token: "invalid", foreground: colors.error.slice(1) },
    ],
    colors: {
      "editor.background": colors.bgSecondary,
      "editor.foreground": colors.textPrimary,
      "editor.lineHighlightBackground": colors.bgTertiary,
      "editor.selectionBackground": light ? "#00000018" : "#ffffff20",
      "editorCursor.foreground": light ? colors.textPrimary : colors.accent,
      "editorLineNumber.foreground": colors.textMuted,
      "editorLineNumber.activeForeground": colors.textSecondary,
      "editorGutter.background": colors.bgSecondary,
      "editorWidget.background": colors.bgTertiary,
      "editorWidget.border": colors.border,
      "input.background": colors.bgPrimary,
      "input.foreground": colors.textPrimary,
      "input.border": colors.border,
      "list.activeSelectionBackground": light ? "#00000012" : "#ffffff15",
      "list.hoverBackground": light ? "#0000000a" : "#ffffff10",
    },
  };
}
