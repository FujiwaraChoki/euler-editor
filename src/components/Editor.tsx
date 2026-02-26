import React, { useRef, useCallback, useEffect, useState } from "react";
import MonacoEditor, { type OnMount, type OnChange } from "@monaco-editor/react";
import type { editor as monacoEditor } from "monaco-editor";
import { initVimMode } from "monaco-vim";
import { latexLanguageConfig, latexMonarchTokens } from "../lib/latex-language";
import { registerLatexCompletionProvider } from "../lib/latex-snippets";
import { EULER_MONACO_THEME } from "../hooks/useTheme";

interface EditorProps {
  value: string;
  onChange: (value: string) => void;
  onMount?: (editor: monacoEditor.IStandaloneCodeEditor) => void;
  className?: string;
  vimMode?: boolean;
  relativeLineNumbers?: boolean;
  showLineNumbers?: boolean;
  fontSize?: number;
  codeFontFamily?: string;
}

const LATEX_LANGUAGE_ID = "latex";

const Editor: React.FC<EditorProps> = ({
  value,
  onChange,
  onMount: onMountProp,
  className,
  vimMode = false,
  relativeLineNumbers = false,
  showLineNumbers = true,
  fontSize = 14,
  codeFontFamily = "\"Geist Mono\", \"SF Mono\", Menlo, monospace",
}) => {
  const editorRef = useRef<monacoEditor.IStandaloneCodeEditor | null>(null);
  const languageRegisteredRef = useRef(false);
  const vimModeRef = useRef<ReturnType<typeof initVimMode> | null>(null);
  const statusBarRef = useRef<HTMLDivElement | null>(null);
  const [editorReady, setEditorReady] = useState(false);

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
        registerLatexCompletionProvider(monaco);

        languageRegisteredRef.current = true;
      }

      // Focus the editor
      editor.focus();
      setEditorReady(true);

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
      // Ensure non-vim mode always restores Monaco's standard cursor.
      editor.updateOptions({
        cursorStyle: "line",
        cursorBlinking: "blink",
      });
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
  }, [vimMode, editorReady]);

  const handleChange: OnChange = useCallback(
    (val) => {
      onChange(val ?? "");
    },
    [onChange]
  );

  return (
    <div className={className} style={{ height: "100%", width: "100%", display: "flex", flexDirection: "column" }}>
      <div style={{ flex: 1, minHeight: 0, paddingLeft: 12, background: "var(--bg-secondary)" }}>
        <MonacoEditor
          height="100%"
          width="100%"
          language={LATEX_LANGUAGE_ID}
          theme={EULER_MONACO_THEME}
          value={value}
          onChange={handleChange}
          onMount={handleMount}
          options={{
            fontFamily: codeFontFamily,
            fontSize,
            minimap: { enabled: false },
            wordWrap: "on",
            smoothScrolling: true,
            lineNumbers: showLineNumbers ? (relativeLineNumbers ? "relative" : "on") : "off",
            renderWhitespace: "selection",
            padding: { top: 16, bottom: 16 },
            glyphMargin: false,
            folding: false,
            lineNumbersMinChars: 3,
            lineDecorationsWidth: 8,
            scrollBeyondLastLine: false,
            automaticLayout: true,
            overviewRulerLanes: 0,
            hideCursorInOverviewRuler: true,
            overviewRulerBorder: false,
            scrollbar: {
              verticalScrollbarSize: 6,
              horizontalScrollbarSize: 6,
              useShadows: false,
            },
            contextmenu: false,
            quickSuggestions: { strings: false, comments: false, other: false },
            parameterHints: { enabled: false },
            suggestOnTriggerCharacters: true,
            tabSize: 2,
            insertSpaces: true,
            bracketPairColorization: { enabled: false },
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
        <>
          <style>{`
            .euler-vim-status input {
              all: unset;
              font-family: inherit;
              font-size: inherit;
              color: var(--text-primary);
            }
          `}</style>
          <div
            ref={statusBarRef}
            className="euler-vim-status"
            style={{
              height: "24px",
              minHeight: "24px",
              padding: "0 12px",
              display: "flex",
              alignItems: "center",
              gap: "6px",
              background: "var(--bg-tertiary)",
              borderTop: "1px solid var(--border)",
              fontFamily: "var(--font-mono)",
              fontSize: "11px",
              color: "var(--text-muted)",
            }}
          />
        </>
      )}
    </div>
  );
};

export default Editor;
