import React, { useRef, useCallback, useEffect } from "react";
import MonacoEditor, { type OnMount, type OnChange } from "@monaco-editor/react";
import type { editor as monacoEditor } from "monaco-editor";
import { initVimMode } from "monaco-vim";
import { latexLanguageConfig, latexMonarchTokens } from "../lib/latex-language";
import { createMonacoTheme } from "../styles/monaco-theme";
import { DEFAULT_DARK_THEME } from "../styles/themes";
import { EULER_MONACO_THEME } from "../hooks/useTheme";

interface EditorProps {
  value: string;
  onChange: (value: string) => void;
  onMount?: (editor: monacoEditor.IStandaloneCodeEditor) => void;
  className?: string;
  vimMode?: boolean;
}

const LATEX_LANGUAGE_ID = "latex";

const Editor: React.FC<EditorProps> = ({ value, onChange, onMount: onMountProp, className, vimMode = false }) => {
  const editorRef = useRef<monacoEditor.IStandaloneCodeEditor | null>(null);
  const languageRegisteredRef = useRef(false);
  const vimModeRef = useRef<ReturnType<typeof initVimMode> | null>(null);
  const statusBarRef = useRef<HTMLDivElement | null>(null);

  const handleMount: OnMount = useCallback(
    (editor, monaco) => {
      editorRef.current = editor;

      // Register LaTeX language only once
      if (!languageRegisteredRef.current) {
        // Check if already registered (e.g., in hot reload)
        const languages = monaco.languages.getLanguages();
        const alreadyRegistered = languages.some((lang: { id: string }) => lang.id === LATEX_LANGUAGE_ID);

        if (!alreadyRegistered) {
          monaco.languages.register({ id: LATEX_LANGUAGE_ID });
        }

        monaco.languages.setLanguageConfiguration(LATEX_LANGUAGE_ID, latexLanguageConfig);
        monaco.languages.setMonarchTokensProvider(LATEX_LANGUAGE_ID, latexMonarchTokens);

        languageRegisteredRef.current = true;
      }

      // Define and set the Monaco theme
      const monacoThemeData = createMonacoTheme(DEFAULT_DARK_THEME.colors);
      monaco.editor.defineTheme(EULER_MONACO_THEME, monacoThemeData);
      monaco.editor.setTheme(EULER_MONACO_THEME);

      // Focus the editor
      editor.focus();

      if (onMountProp) {
        onMountProp(editor);
      }
    },
    [onMountProp]
  );

  // Toggle vim mode on/off
  useEffect(() => {
    const editor = editorRef.current;
    if (!editor) return;

    if (vimMode) {
      // Dispose previous instance if any
      if (vimModeRef.current) {
        vimModeRef.current.dispose();
        vimModeRef.current = null;
      }
      const statusNode = statusBarRef.current;
      if (statusNode) {
        vimModeRef.current = initVimMode(editor, statusNode);
      }
    } else {
      if (vimModeRef.current) {
        vimModeRef.current.dispose();
        vimModeRef.current = null;
      }
      // Clear status bar content
      if (statusBarRef.current) {
        statusBarRef.current.textContent = "";
      }
    }

    return () => {
      if (vimModeRef.current) {
        vimModeRef.current.dispose();
        vimModeRef.current = null;
      }
    };
  }, [vimMode]);

  const handleChange: OnChange = useCallback(
    (val) => {
      onChange(val ?? "");
    },
    [onChange]
  );

  return (
    <div className={className} style={{ height: "100%", width: "100%", display: "flex", flexDirection: "column" }}>
      <div style={{ flex: 1, minHeight: 0 }}>
        <MonacoEditor
          height="100%"
          width="100%"
          language={LATEX_LANGUAGE_ID}
          theme={EULER_MONACO_THEME}
          value={value}
          onChange={handleChange}
          onMount={handleMount}
          options={{
            fontFamily: "'Geist Mono', 'SF Mono', 'Menlo', monospace",
            fontSize: 14,
            minimap: { enabled: false },
            wordWrap: "on",
            smoothScrolling: true,
            lineNumbers: "on",
            renderWhitespace: "selection",
            padding: { top: 16 },
            scrollBeyondLastLine: false,
            automaticLayout: false,
            overviewRulerLanes: 0,
            hideCursorInOverviewRuler: true,
            overviewRulerBorder: false,
            scrollbar: {
              verticalScrollbarSize: 6,
              horizontalScrollbarSize: 6,
              useShadows: false,
            },
            contextmenu: false,
            quickSuggestions: false,
            parameterHints: { enabled: false },
            suggestOnTriggerCharacters: false,
            tabSize: 2,
            insertSpaces: true,
            bracketPairColorization: { enabled: false },
            cursorStyle: vimMode ? "block" : "line",
          }}
          loading={
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                height: "100%",
                color: "var(--text-muted)",
                fontFamily: "var(--font-mono)",
                fontSize: "13px",
              }}
            >
              Loading editor...
            </div>
          }
        />
      </div>
      {vimMode && (
        <div
          ref={statusBarRef}
          style={{
            height: "24px",
            minHeight: "24px",
            padding: "0 12px",
            display: "flex",
            alignItems: "center",
            background: "var(--bg-tertiary)",
            borderTop: "1px solid var(--border)",
            fontFamily: "'Geist Mono', 'SF Mono', 'Menlo', monospace",
            fontSize: "11px",
            color: "var(--text-secondary)",
          }}
        />
      )}
    </div>
  );
};

export default Editor;
