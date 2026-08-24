import React, { useState, useCallback, useEffect, useRef, useMemo } from "react";
import { Group, Panel, Separator, type PanelImperativeHandle } from "react-resizable-panels";
import type { editor as monacoEditor } from "monaco-editor";
import Editor from "./components/Editor";
import PdfPreview from "./components/PdfPreview";
import CompileIndicator from "./components/CompileIndicator";
import CommandPalette from "./components/CommandPalette";
import CodexPanel from "./components/CodexPanel";
import QuickOpen from "./components/QuickOpen";
import FileTree from "./components/FileTree";
import { useCodex } from "./hooks/useCodex";
import { useSettings } from "./hooks/useSettings";
import { useTheme } from "./hooks/useTheme";
import { useCompiler } from "./hooks/useCompiler";
import { useFileOperations } from "./hooks/useFileOperations";
import { useFileTree } from "./hooks/useFileTree";
import { useCliArgs } from "./hooks/useCliArgs";
import { useCliIntegration } from "./hooks/useCliIntegration";
import { useKeyboardShortcuts } from "./hooks/useKeyboardShortcuts";
import { getSystemFonts } from "./lib/tauri-commands";
import { fontCssFromName, normalizeStoredFontName } from "./styles/fonts";

type FlashTone = "success" | "error" | "info";

interface FlashMessage {
  tone: FlashTone;
  title: string;
  detail: string;
}

const App: React.FC = () => {
  const { settings, updateSettings, isLoaded: settingsLoaded } = useSettings();
  const { themes, currentTheme, setTheme } = useTheme();
  const {
    status: codexStatus,
    isLoadingStatus: isCodexStatusLoading,
    isApplying: isApplyingCodex,
    refreshStatus: refreshCodexStatus,
    runEdit: runCodexEdit,
  } = useCodex();
  const {
    status: cliStatus,
    isLoading: isCliStatusLoading,
    isInstalling: isInstallingCli,
    refresh: refreshCliIntegration,
    install: installCliIntegration,
  } = useCliIntegration();
  const [copied, setCopied] = useState(false);
  const [codexPanelOpen, setCodexPanelOpen] = useState(false);
  const [codexLastMessage, setCodexLastMessage] = useState<string | null>(null);
  const [codexLastError, setCodexLastError] = useState<string | null>(null);
  const [flashMessage, setFlashMessage] = useState<FlashMessage | null>(null);
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
  const [commandPaletteInitialView, setCommandPaletteInitialView] = useState<"main" | "cli">("main");
  const [quickOpenOpen, setQuickOpenOpen] = useState(false);
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

  const sidebarPanelRef = useRef<PanelImperativeHandle>(null);

  const sidebarRootPath = useMemo(() => {
    if (!filePath) return null;
    const parts = filePath.split("/");
    parts.pop();
    return parts.join("/") || null;
  }, [filePath]);

  const {
    nodes: fileTreeNodes,
    rootPath: fileTreeRootPath,
    toggleExpand: fileTreeToggleExpand,
    rootName: fileTreeRootName,
    createFile: fileTreeCreateFile,
    createFolder: fileTreeCreateFolder,
    renameNode: fileTreeRenameNode,
    deleteNode: fileTreeDeleteNode,
  } = useFileTree(sidebarRootPath);

  const toggleSidebar = useCallback(() => {
    const panel = sidebarPanelRef.current;
    if (!panel) return;
    if (panel.isCollapsed()) {
      panel.expand();
      updateSettings({ sidebar_visible: true });
    } else {
      panel.collapse();
      updateSettings({ sidebar_visible: false });
    }
  }, [updateSettings]);

  const handleSidebarResize = useCallback(
    (panelSize: { asPercentage: number; inPixels: number }) => {
      const collapsed = panelSize.inPixels === 0;
      if (collapsed && settings.sidebar_visible) {
        updateSettings({ sidebar_visible: false });
      } else if (!collapsed && !settings.sidebar_visible) {
        updateSettings({ sidebar_visible: true });
      }
    },
    [settings.sidebar_visible, updateSettings],
  );

  const handleOpenFileFromTree = useCallback(
    (path: string) => {
      openFile(path).catch(() => {});
    },
    [openFile],
  );

  const fileStem = filePath
    ? filePath.split("/").pop()?.replace(/\.tex$/i, "") ?? "untitled"
    : "untitled";

  const isTexFile = !!filePath && /\.tex$/i.test(filePath);

  const { compileResult, isCompiling } = useCompiler({
    content: hasFile && isTexFile ? content : "",
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

  useEffect(() => {
    if (!codexPanelOpen) return;
    refreshCodexStatus().catch(() => {});
  }, [codexPanelOpen, refreshCodexStatus]);

  useEffect(() => {
    if (!commandPaletteOpen && hasFile) return;
    refreshCliIntegration().catch(() => {});
  }, [commandPaletteOpen, hasFile, refreshCliIntegration]);

  useEffect(() => {
    if (!flashMessage) return;
    const timeout = setTimeout(() => {
      setFlashMessage(null);
    }, 4000);
    return () => clearTimeout(timeout);
  }, [flashMessage]);

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

  const toggleCodexPanel = useCallback(() => {
    setCodexPanelOpen((current) => !current);
  }, []);

  const openCommandPaletteMain = useCallback(() => {
    setQuickOpenOpen(false);
    setCommandPaletteInitialView("main");
    setCommandPaletteOpen(true);
  }, []);

  const shortcuts = useMemo(
    () => ({
      "mod+k": openCommandPaletteMain,
      "mod+,": openCommandPaletteMain,
      "mod+p": () => { setCommandPaletteOpen(false); setQuickOpenOpen(true); },
      "mod+o": () => { openFileDialog().catch(() => {}); },
      "mod+s": () => { saveFile().catch(() => {}); },
      "mod+n": () => { createNewFile(); },
      "mod+plus": increaseSize,
      "mod+shift+plus": increaseSize,
      "mod+equal": increaseSize,
      "mod+minus": decreaseSize,
      "mod+b": toggleSidebar,
      "mod+j": toggleCodexPanel,
    }),
    [saveFile, openFileDialog, createNewFile, increaseSize, decreaseSize, toggleSidebar, openCommandPaletteMain, toggleCodexPanel]
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
  const showFlash = useCallback((tone: FlashTone, title: string, detail: string) => {
    setFlashMessage({ tone, title, detail });
  }, []);
  const handleInstallCli = useCallback(async () => {
    try {
      const previousStatus = cliStatus;
      const nextStatus = await installCliIntegration();
      showFlash(
        "success",
        previousStatus?.installed ? "CLI helper refreshed" : "CLI helper installed",
        `Euler is ready at ${nextStatus.installPath}.`,
      );
    } catch (error) {
      showFlash("error", "CLI helper install failed", String(error));
    }
  }, [cliStatus, installCliIntegration, showFlash]);
  const handleCopyCliCommand = useCallback(async () => {
    if (!filePath) return;
    try {
      await navigator.clipboard.writeText(`euler "${filePath}"`);
      showFlash("info", "Launch command copied", `Run euler "${filePath}" from Codex or a terminal.`);
    } catch {
      showFlash("error", "Could not copy command", "Clipboard access is unavailable right now.");
    }
  }, [filePath, showFlash]);
  const handleCodexSubmit = useCallback(async (prompt: string) => {
    if (!filePath) {
      const detail = "Open a saved LaTeX file before asking Codex to edit it.";
      setCodexLastError(detail);
      showFlash("error", "Codex needs a saved file", detail);
      return;
    }

    setCodexLastError(null);

    try {
      if (isDirty) {
        await saveFile();
      }

      const result = await runCodexEdit(prompt, filePath);
      await openFile(filePath);
      setCodexLastMessage(result.assistantMessage || "Codex updated the file.");
      showFlash("success", "Codex updated the file", result.assistantMessage || "The latest edits have been loaded into Euler.");
    } catch (error) {
      const detail = String(error);
      setCodexLastError(detail);
      showFlash("error", "Codex edit failed", detail);
      throw error;
    }
  }, [filePath, isDirty, openFile, runCodexEdit, saveFile, showFlash]);

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
          onOpenCodexAssistant={() => {
            setCommandPaletteOpen(false);
            showFlash("info", "Open a file first", "Codex can edit a saved LaTeX file once one is open in Euler.");
          }}
          settings={settings}
          onUpdateSettings={updateSettings}
          themes={themes}
          currentThemeName={currentTheme.name}
          onSetTheme={handleSetTheme}
          systemFonts={systemFonts}
          initialView={commandPaletteInitialView}
          cliStatus={cliStatus}
          isCliStatusLoading={isCliStatusLoading}
          isInstallingCli={isInstallingCli}
          onInstallCli={handleInstallCli}
          onCopyCliCommand={handleCopyCliCommand}
          currentFilePath={filePath}
        />
        <QuickOpen
          isOpen={quickOpenOpen}
          onClose={() => setQuickOpenOpen(false)}
          rootPath={sidebarRootPath}
          onOpenFile={(path) => openFile(path).catch(() => {})}
          currentFilePath={filePath}
        />
        {flashMessage && (
          <div style={flashContainerStyle}>
            <div
              style={{
                ...flashCardStyle,
                ...(flashMessage.tone === "success"
                  ? flashCardSuccessStyle
                  : flashMessage.tone === "error"
                    ? flashCardErrorStyle
                    : flashCardInfoStyle),
              }}
            >
              <div style={flashTitleStyle}>{flashMessage.title}</div>
              <div style={flashDetailStyle}>{flashMessage.detail}</div>
            </div>
          </div>
        )}
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
            onClick={toggleCodexPanel}
            style={{
              ...codexBtnStyle,
              ...(codexPanelOpen ? codexBtnActiveStyle : {}),
            }}
            title="Codex Assistant (Cmd+J)"
          >
            Codex
          </button>
          <button
            onClick={openCommandPaletteMain}
            style={cmdBtnStyle}
            title="Command Palette (Cmd+K)"
          >
            <Cmd />K
          </button>
        </div>
      </header>

      {/* Sidebar + Editor + Preview */}
      <div style={mainStyle}>
        <Group orientation="horizontal" onLayoutChanged={handlePanelResize}>
          <Panel
            panelRef={sidebarPanelRef}
            defaultSize={settings.sidebar_visible ? 220 : 0}
            minSize={160}
            maxSize={400}
            collapsible
            collapsedSize={0}
            onResize={handleSidebarResize}
          >
            <FileTree
              rootName={fileTreeRootName}
              rootPath={fileTreeRootPath}
              nodes={fileTreeNodes}
              activeFilePath={filePath}
              onToggleExpand={fileTreeToggleExpand}
              onOpenFile={handleOpenFileFromTree}
              onCreateFile={fileTreeCreateFile}
              onCreateFolder={fileTreeCreateFolder}
              onRenameNode={fileTreeRenameNode}
              onDeleteNode={fileTreeDeleteNode}
            />
          </Panel>
          <Separator style={handleStyle} />
          <Panel minSize={200}>
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
          </Panel>
        </Group>
      </div>

      <CommandPalette
        isOpen={commandPaletteOpen}
        onClose={() => setCommandPaletteOpen(false)}
        onNewDocument={createNewFile}
        onOpenDocument={() => openFileDialog().catch(() => {})}
        onOpenCodexAssistant={() => setCodexPanelOpen(true)}
        settings={settings}
        onUpdateSettings={updateSettings}
        themes={themes}
        currentThemeName={currentTheme.name}
        onSetTheme={handleSetTheme}
        systemFonts={systemFonts}
        initialView={commandPaletteInitialView}
        cliStatus={cliStatus}
        isCliStatusLoading={isCliStatusLoading}
        isInstallingCli={isInstallingCli}
        onInstallCli={handleInstallCli}
        onCopyCliCommand={handleCopyCliCommand}
        currentFilePath={filePath}
      />
      <QuickOpen
        isOpen={quickOpenOpen}
        onClose={() => setQuickOpenOpen(false)}
        rootPath={sidebarRootPath}
        onOpenFile={(path) => openFile(path).catch(() => {})}
        currentFilePath={filePath}
      />
      <CodexPanel
        isOpen={codexPanelOpen}
        onClose={() => setCodexPanelOpen(false)}
        onSubmit={handleCodexSubmit}
        status={codexStatus}
        isLoadingStatus={isCodexStatusLoading}
        isRunning={isApplyingCodex}
        currentFilePath={filePath}
        isDirty={isDirty}
        lastMessage={codexLastMessage}
        lastError={codexLastError}
      />
      {flashMessage && (
        <div style={flashContainerStyle}>
          <div
            style={{
              ...flashCardStyle,
              ...(flashMessage.tone === "success"
                ? flashCardSuccessStyle
                : flashMessage.tone === "error"
                  ? flashCardErrorStyle
                  : flashCardInfoStyle),
            }}
          >
            <div style={flashTitleStyle}>{flashMessage.title}</div>
            <div style={flashDetailStyle}>{flashMessage.detail}</div>
          </div>
        </div>
      )}
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
  position: "relative",
  overflow: "hidden",
};

const welcomeContent: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  gap: "20px",
  padding: "32px",
  position: "relative",
  zIndex: 1,
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

const codexBtnStyle: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  padding: "5px 10px",
  borderRadius: "999px",
  border: "1px solid var(--border)",
  background: "var(--bg-tertiary)",
  color: "var(--text-secondary)",
  cursor: "pointer",
  fontFamily: "var(--font-sans)",
  fontSize: "12px",
  fontWeight: 600,
  letterSpacing: "-0.01em",
  transition: "border-color 0.15s, color 0.15s, background 0.15s",
};

const codexBtnActiveStyle: React.CSSProperties = {
  background: "var(--accent)",
  color: "var(--bg-primary)",
  borderColor: "var(--accent)",
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

const flashContainerStyle: React.CSSProperties = {
  position: "fixed",
  right: "18px",
  bottom: "18px",
  zIndex: 1200,
};

const flashCardStyle: React.CSSProperties = {
  minWidth: "280px",
  maxWidth: "420px",
  padding: "14px 16px",
  borderRadius: "14px",
  border: "1px solid rgba(255, 255, 255, 0.08)",
  background: "rgba(10, 10, 10, 0.9)",
  backdropFilter: "blur(12px)",
  boxShadow: "0 18px 40px rgba(0, 0, 0, 0.28)",
};

const flashCardSuccessStyle: React.CSSProperties = {
  border: "1px solid rgba(80, 227, 194, 0.24)",
};

const flashCardErrorStyle: React.CSSProperties = {
  border: "1px solid rgba(255, 99, 105, 0.24)",
};

const flashCardInfoStyle: React.CSSProperties = {
  border: "1px solid rgba(255, 255, 255, 0.12)",
};

const flashTitleStyle: React.CSSProperties = {
  fontFamily: "var(--font-sans)",
  fontSize: "13px",
  fontWeight: 600,
  color: "var(--text-primary)",
};

const flashDetailStyle: React.CSSProperties = {
  marginTop: "4px",
  fontFamily: "var(--font-sans)",
  fontSize: "12px",
  lineHeight: 1.5,
  color: "var(--text-secondary)",
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
