import React, { useState, useCallback, useEffect, useRef, useMemo } from "react";
import { Group, Panel, Separator } from "react-resizable-panels";
import type { editor as monacoEditor } from "monaco-editor";
import Editor from "./components/Editor";
import PdfPreview from "./components/PdfPreview";
import CompileIndicator from "./components/CompileIndicator";
import CommandPalette from "./components/CommandPalette";
import { useSettings } from "./hooks/useSettings";
import { useTheme } from "./hooks/useTheme";
import { useCompiler } from "./hooks/useCompiler";
import { useFileOperations } from "./hooks/useFileOperations";
import { useCliArgs } from "./hooks/useCliArgs";
import { useKeyboardShortcuts } from "./hooks/useKeyboardShortcuts";
import { getSystemFonts } from "./lib/tauri-commands";
import { fontCssFromName, normalizeStoredFontName } from "./styles/fonts";

const App: React.FC = () => {
  const { settings, updateSettings, isLoaded: settingsLoaded } = useSettings();
  const { themes, currentTheme, setTheme } = useTheme();
  const [copied, setCopied] = useState(false);
  const [editorFontSize, setEditorFontSize] = useState(14);
  const [pdfZoom, setPdfZoom] = useState(1);
  const [isPdfHovered, setIsPdfHovered] = useState(false);
  const [isPdfFocused, setIsPdfFocused] = useState(false);
  const {
    filePath,
    content,
    setContent,
    openFile,
    openFileDialog,
    saveFile,
    createNewFile,
    isDirty,
    fileName,
    hasFile,
  } = useFileOperations();
  const { initialFilePath } = useCliArgs();

  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);
  const [systemFonts, setSystemFonts] = useState<string[]>([]);
  const editorRef = useRef<monacoEditor.IStandaloneCodeEditor | null>(null);
  const uiFontName = useMemo(
    () => normalizeStoredFontName(settings.ui_font, "ui"),
    [settings.ui_font],
  );
  const codeFontName = useMemo(
    () => normalizeStoredFontName(settings.code_font, "code"),
    [settings.code_font],
  );
  const uiFontFamily = useMemo(
    () => fontCssFromName(uiFontName, "ui"),
    [uiFontName],
  );
  const codeFontFamily = useMemo(
    () => fontCssFromName(codeFontName, "code"),
    [codeFontName],
  );

  const fileStem = filePath
    ? filePath.split("/").pop()?.replace(/\.tex$/i, "") ?? "untitled"
    : "untitled";

  const { compileResult, isCompiling } = useCompiler({
    content: hasFile ? content : "",
    fileStem,
    compiler: settings.compiler,
    debounceMs: settings.debounce_ms,
    filePath,
  });

  // Open file from CLI args on startup
  useEffect(() => {
    if (initialFilePath) {
      openFile(initialFilePath).catch(() => {});
    }
  }, [initialFilePath]); // eslint-disable-line react-hooks/exhaustive-deps

  // Apply the persisted theme once settings are loaded
  useEffect(() => {
    if (!settingsLoaded) return;
    setTheme(settings.theme).catch(() => {});
  }, [settingsLoaded, settings.theme, setTheme]);

  // Update document title
  useEffect(() => {
    if (!hasFile) {
      document.title = "Euler";
      return;
    }
    const title = fileName === "Untitled" ? "Euler" : `Euler - ${fileName}`;
    document.title = isDirty ? `${title} (unsaved)` : title;
  }, [fileName, isDirty, hasFile]);

  // Load installed system fonts for font picker search/filtering
  useEffect(() => {
    getSystemFonts().then((fonts) => {
      setSystemFonts(fonts);
    }).catch(() => {
      // Backend unavailable (e.g., browser-only dev); fallback to built-in options.
      setSystemFonts([]);
    });
  }, []);

  // Apply typography from settings
  useEffect(() => {
    document.documentElement.style.setProperty("--font-sans", uiFontFamily);
    document.documentElement.style.setProperty("--font-mono", codeFontFamily);
  }, [uiFontFamily, codeFontFamily]);

  // Auto-save
  useEffect(() => {
    if (settings.auto_save && isDirty && filePath) {
      const timeout = setTimeout(() => {
        saveFile().catch(() => {});
      }, 2000);
      return () => clearTimeout(timeout);
    }
  }, [settings.auto_save, isDirty, filePath, content, saveFile]);

  // Keyboard shortcuts
  const changeEditorFontSize = useCallback((delta: number) => {
    setEditorFontSize((current) => Math.max(10, Math.min(32, current + delta)));
  }, []);

  const changePdfZoom = useCallback((delta: number) => {
    setPdfZoom((current) => {
      const next = current + delta;
      return Math.max(0.5, Math.min(3, Number(next.toFixed(2))));
    });
  }, []);

  const zoomTargetIsPdf = isPdfHovered || isPdfFocused;

  const increaseSize = useCallback(() => {
    if (zoomTargetIsPdf) {
      changePdfZoom(0.1);
      return;
    }
    changeEditorFontSize(1);
  }, [changeEditorFontSize, changePdfZoom, zoomTargetIsPdf]);

  const decreaseSize = useCallback(() => {
    if (zoomTargetIsPdf) {
      changePdfZoom(-0.1);
      return;
    }
    changeEditorFontSize(-1);
  }, [changeEditorFontSize, changePdfZoom, zoomTargetIsPdf]);

  const shortcuts = useMemo(
    () => ({
      "mod+k": () => setCommandPaletteOpen(true),
      "mod+o": () => { openFileDialog().catch(() => {}); },
      "mod+s": () => { saveFile().catch(() => {}); },
      "mod+n": () => { createNewFile(); },
      "mod+plus": increaseSize,
      "mod+shift+plus": increaseSize,
      "mod+equal": increaseSize,
      "mod+minus": decreaseSize,
    }),
    [saveFile, openFileDialog, createNewFile, increaseSize, decreaseSize]
  );
  useKeyboardShortcuts(shortcuts);

  const handleEditorChange = useCallback(
    (value: string) => setContent(value),
    [setContent]
  );

  const handleEditorMount = useCallback((editor: monacoEditor.IStandaloneCodeEditor) => {
    editorRef.current = editor;
  }, []);

  const handlePanelResize = useCallback(() => {
    requestAnimationFrame(() => {
      editorRef.current?.layout();
    });
  }, []);

  const handleSetTheme = useCallback(
    (themeName: string) => {
      updateSettings({ theme: themeName }).catch(() => {});
    },
    [updateSettings]
  );

  const pdfBase64 = compileResult?.pdf_base64 ?? null;
  const compileErrors = compileResult?.errors ?? [];
  const compileSuccess = compileResult?.success ?? false;

  // Welcome screen when no file is open
  if (!hasFile) {
    return (
      <div style={welcomeContainer}>
        <div style={welcomeContent}>
          <h1 style={welcomeTitle}>Euler</h1>
          <p style={welcomeSubtitle}>A minimal LaTeX editor</p>
          <div style={welcomeActions}>
            <button onClick={() => openFileDialog().catch(() => {})} style={welcomeButton}>
              <span style={welcomeKeybinding}>
                <Cmd />O
              </span>
              <span>Open File</span>
            </button>
            <button onClick={createNewFile} style={welcomeButton}>
              <span style={welcomeKeybinding}>
                <Cmd />N
              </span>
              <span>New Document</span>
            </button>
          </div>
        </div>

        <CommandPalette
          isOpen={commandPaletteOpen}
          onClose={() => setCommandPaletteOpen(false)}
          onNewDocument={createNewFile}
          onOpenDocument={() => openFileDialog().catch(() => {})}
          settings={settings}
          onUpdateSettings={updateSettings}
          themes={themes}
          currentThemeName={currentTheme.name}
          onSetTheme={handleSetTheme}
          systemFonts={systemFonts}
        />
      </div>
    );
  }

  return (
    <div style={appContainerStyle}>
      {/* Header */}
      <header style={headerStyle}>
        <div style={headerLeftStyle}>
          <span style={logoStyle}>Euler</span>
          <span style={sepStyle}>/</span>
          <span style={fileNameStyle}>
            {fileName}
            {isDirty && <span style={dirtyStyle}>*</span>}
          </span>
          {filePath && (
            <button
              onClick={() => {
                navigator.clipboard.writeText(filePath);
                setCopied(true);
                setTimeout(() => setCopied(false), 2000);
              }}
              style={copyBtnStyle}
            >
              <span style={copyBtnInnerStyle}>
                <span style={{
                  ...copyTextStyle,
                  opacity: copied ? 0 : 1,
                  transform: copied ? "translateY(-6px)" : "translateY(0)",
                }}>Copy</span>
                <span style={{
                  ...copiedTextStyle,
                  opacity: copied ? 1 : 0,
                  transform: copied ? "translateY(0)" : "translateY(6px)",
                }}>
                  <svg width="10" height="10" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="2 6 5 9 10 3" />
                  </svg>
                </span>
              </span>
            </button>
          )}
        </div>
        <div style={headerRightStyle}>
          <CompileIndicator
            isCompiling={isCompiling}
            errors={compileErrors}
            success={compileSuccess}
          />
          <button
            onClick={() => setCommandPaletteOpen(true)}
            style={cmdBtnStyle}
            title="Command Palette (Cmd+K)"
          >
            <Cmd />K
          </button>
        </div>
      </header>

      {/* Editor + Preview */}
      <div style={mainStyle}>
        <Group orientation={settings.split_orientation === "vertical" ? "vertical" : "horizontal"} onLayoutChanged={handlePanelResize}>
          <Panel defaultSize={50} minSize={30}>
            <Editor
              value={content}
              onChange={handleEditorChange}
              onMount={handleEditorMount}
              vimMode={settings.vim_mode}
              relativeLineNumbers={settings.relative_line_numbers}
              showLineNumbers={settings.show_line_numbers}
              fontSize={editorFontSize}
              codeFontFamily={codeFontFamily}
            />
          </Panel>
          <Separator style={settings.split_orientation === "vertical" ? verticalHandleStyle : handleStyle} />
          <Panel defaultSize={50} minSize={20}>
            <PdfPreview
              pdfBase64={pdfBase64}
              errors={compileErrors}
              isCompiling={isCompiling}
              zoom={pdfZoom}
              onHoverChange={setIsPdfHovered}
              onFocusChange={setIsPdfFocused}
            />
          </Panel>
        </Group>
      </div>

      <CommandPalette
        isOpen={commandPaletteOpen}
        onClose={() => setCommandPaletteOpen(false)}
        onNewDocument={createNewFile}
        onOpenDocument={() => openFileDialog().catch(() => {})}
        settings={settings}
        onUpdateSettings={updateSettings}
        themes={themes}
        currentThemeName={currentTheme.name}
        onSetTheme={handleSetTheme}
        systemFonts={systemFonts}
      />
    </div>
  );
};

// Tiny command key glyph
const Cmd: React.FC = () => (
  <span style={{ fontFamily: "var(--font-sans)", fontSize: "inherit" }}>&#8984;</span>
);

// --- Welcome screen styles ---

const welcomeContainer: React.CSSProperties = {
  height: "100%",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  background: "var(--bg-primary)",
};

const welcomeContent: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  gap: "24px",
};

const welcomeTitle: React.CSSProperties = {
  fontFamily: "var(--font-sans)",
  fontSize: "28px",
  fontWeight: 600,
  color: "var(--text-primary)",
  letterSpacing: "-0.02em",
};

const welcomeSubtitle: React.CSSProperties = {
  fontFamily: "var(--font-sans)",
  fontSize: "13px",
  color: "var(--text-muted)",
  marginTop: "-16px",
};

const welcomeActions: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: "6px",
  marginTop: "8px",
  width: "200px",
};

const welcomeButton: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: "12px",
  padding: "10px 14px",
  background: "transparent",
  border: "1px solid var(--border)",
  borderRadius: "8px",
  color: "var(--text-secondary)",
  cursor: "pointer",
  fontFamily: "var(--font-sans)",
  fontSize: "13px",
  transition: "border-color 0.15s, color 0.15s",
  textAlign: "left",
};

const welcomeKeybinding: React.CSSProperties = {
  fontFamily: "var(--font-mono)",
  fontSize: "11px",
  color: "var(--text-muted)",
  background: "var(--bg-tertiary)",
  padding: "2px 6px",
  borderRadius: "4px",
  border: "1px solid var(--border)",
  minWidth: "36px",
  textAlign: "center",
};

// --- Editor view styles ---

const appContainerStyle: React.CSSProperties = {
  height: "100%",
  display: "flex",
  flexDirection: "column",
  overflow: "hidden",
};

const headerStyle: React.CSSProperties = {
  height: "40px",
  minHeight: "40px",
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  padding: "0 16px",
  borderBottom: "1px solid var(--border)",
  background: "var(--bg-secondary)",
  userSelect: "none",
};

const headerLeftStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: "8px",
};

const logoStyle: React.CSSProperties = {
  fontFamily: "var(--font-sans)",
  fontSize: "13px",
  fontWeight: 600,
  color: "var(--text-primary)",
};

const sepStyle: React.CSSProperties = {
  color: "var(--text-muted)",
  fontSize: "13px",
};

const fileNameStyle: React.CSSProperties = {
  fontFamily: "var(--font-mono)",
  fontSize: "12px",
  color: "var(--text-secondary)",
};

const dirtyStyle: React.CSSProperties = {
  color: "var(--text-muted)",
  marginLeft: "2px",
};

const copyBtnStyle: React.CSSProperties = {
  padding: "1px 2px",
  background: "transparent",
  border: "1px solid var(--border)",
  borderRadius: "4px",
  cursor: "pointer",
  fontFamily: "var(--font-mono)",
  fontSize: "10px",
  lineHeight: 1,
  overflow: "hidden",
  transition: "border-color 0.15s",
  display: "inline-flex",
  alignItems: "center",
};

const copyBtnInnerStyle: React.CSSProperties = {
  position: "relative",
  display: "inline-block",
  width: "38px",
  height: "16px",
};

const copyTextStyle: React.CSSProperties = {
  position: "absolute",
  inset: 0,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  color: "var(--text-muted)",
  transition: "opacity 0.2s ease, transform 0.2s ease",
};

const copiedTextStyle: React.CSSProperties = {
  position: "absolute",
  inset: 0,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  color: "var(--text-muted)",
  transition: "opacity 0.2s ease, transform 0.2s ease",
};

const headerRightStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: "12px",
};

const cmdBtnStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: "2px",
  padding: "4px 8px",
  background: "var(--bg-tertiary)",
  border: "1px solid var(--border)",
  borderRadius: "6px",
  color: "var(--text-muted)",
  cursor: "pointer",
  fontFamily: "var(--font-mono)",
  fontSize: "11px",
};

const mainStyle: React.CSSProperties = {
  flex: 1,
  overflow: "hidden",
};

const handleStyle: React.CSSProperties = {
  width: "1px",
  background: "var(--border)",
  cursor: "col-resize",
};

const verticalHandleStyle: React.CSSProperties = {
  height: "1px",
  background: "var(--border)",
  cursor: "row-resize",
};

export default App;
