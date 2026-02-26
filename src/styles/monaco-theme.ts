import type { editor } from "monaco-editor";
import type { ThemeColors } from "../types";

export function createMonacoTheme(colors: ThemeColors): editor.IStandaloneThemeData {
  return {
    base: "vs-dark",
    inherit: false,
    rules: [
      { token: "", foreground: colors.textPrimary.slice(1) },
      { token: "comment", foreground: colors.textMuted.slice(1), fontStyle: "italic" },
      { token: "keyword", foreground: "c084fc" },
      { token: "command", foreground: "60a5fa" },
      { token: "math", foreground: colors.success.slice(1) },
      { token: "math.delimiter", foreground: colors.success.slice(1) },
      { token: "bracket", foreground: colors.warning.slice(1) },
      { token: "environment", foreground: "f472b6" },
      { token: "string", foreground: "fbbf24" },
      { token: "number", foreground: colors.success.slice(1) },
      { token: "delimiter", foreground: colors.textSecondary.slice(1) },
      { token: "invalid", foreground: colors.error.slice(1) },
    ],
    colors: {
      "editor.background": colors.bgSecondary,
      "editor.foreground": colors.textPrimary,
      "editor.lineHighlightBackground": colors.bgTertiary,
      "editor.selectionBackground": "#ffffff20",
      "editorCursor.foreground": colors.accent,
      "editorLineNumber.foreground": colors.textMuted,
      "editorLineNumber.activeForeground": colors.textSecondary,
      "editorGutter.background": colors.bgSecondary,
      "editorWidget.background": colors.bgTertiary,
      "editorWidget.border": colors.border,
      "input.background": colors.bgPrimary,
      "input.foreground": colors.textPrimary,
      "input.border": colors.border,
      "list.activeSelectionBackground": "#ffffff15",
      "list.hoverBackground": "#ffffff10",
    },
  };
}
