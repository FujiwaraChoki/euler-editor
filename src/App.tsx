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

const App: React.FC = () => {
  const { settings, updateSettings } = useSettings();
  const { themes, currentTheme, setTheme } = useTheme();
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
  const editorRef = useRef<monacoEditor.IStandaloneCodeEditor | null>(null);

  const fileStem = filePath
    ? filePath.split("/").pop()?.replace(/\.tex$/i, "") ?? "untitled"
    : "untitled";

  const { compileResult, isCompiling } = useCompiler({
    content: hasFile ? content : "",
    fileStem,
    compiler: settings.compiler,
    debounceMs: settings.debounce_ms,
  });

  // Open file from CLI args on startup
  useEffect(() => {
    if (initialFilePath) {
      openFile(initialFilePath).catch(() => {});
    }
  }, [initialFilePath]); // eslint-disable-line react-hooks/exhaustive-deps

  // Update document title
  useEffect(() => {
    if (!hasFile) {
      document.title = "Euler";
      return;
    }
    const title = fileName === "Untitled" ? "Euler" : `Euler - ${fileName}`;
    document.title = isDirty ? `${title} (unsaved)` : title;
  }, [fileName, isDirty, hasFile]);

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
  const shortcuts = useMemo(
    () => ({
      "mod+k": () => setCommandPaletteOpen(true),
      "mod+o": () => { openFileDialog().catch(() => {}); },
      "mod+s": () => { saveFile().catch(() => {}); },
      "mod+n": () => { createNewFile(); },
    }),
    [saveFile, openFileDialog, createNewFile]
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
      setTheme(themeName);
      updateSettings({ theme: themeName });
    },
    [setTheme, updateSettings]
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
        <Group orientation="horizontal" onLayoutChanged={handlePanelResize}>
          <Panel defaultSize={50} minSize={30}>
            <Editor
              value={content}
              onChange={handleEditorChange}
              onMount={handleEditorMount}
            />
          </Panel>
          <Separator style={handleStyle} />
          <Panel defaultSize={50} minSize={20}>
            <PdfPreview
              pdfBase64={pdfBase64}
              errors={compileErrors}
              isCompiling={isCompiling}
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

export default App;
