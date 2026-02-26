import React, { useState, useEffect, useRef, useCallback, useMemo } from "react";
import type { EulerConfig, Theme } from "../types";
import {
  buildFontOptions,
  normalizeStoredFontName,
} from "../styles/fonts";

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  onNewDocument: () => void;
  onOpenDocument: () => void;
  settings: EulerConfig;
  onUpdateSettings: (partial: Partial<EulerConfig>) => void;
  themes: Theme[];
  currentThemeName: string;
  onSetTheme: (name: string) => void;
  systemFonts: string[];
}

type View = "main" | "themes" | "compiler" | "debounce" | "ui-fonts" | "code-fonts";

const COMPILER_OPTIONS = ["pdflatex", "xelatex", "lualatex"] as const;

interface Action {
  id: string;
  label: string;
  description?: string;
  onSelect: () => void;
}

const CommandPalette: React.FC<CommandPaletteProps> = ({
  isOpen,
  onClose,
  onNewDocument,
  onOpenDocument,
  settings,
  onUpdateSettings,
  themes,
  currentThemeName,
  onSetTheme,
  systemFonts,
}) => {
  const [query, setQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [view, setView] = useState<View>("main");
  const inputRef = useRef<HTMLInputElement>(null);

  // Reset state when opening
  useEffect(() => {
    if (isOpen) {
      setQuery("");
      setSelectedIndex(0);
      setView("main");
      // Delay focus to ensure the input is mounted
      requestAnimationFrame(() => {
        inputRef.current?.focus();
      });
    }
  }, [isOpen]);

  const debouncePresets = useMemo(
    () => [
      { value: 200, label: "200ms (Fast)" },
      { value: 500, label: "500ms" },
      { value: 800, label: "800ms (Default)" },
      { value: 1500, label: "1500ms" },
      { value: 3000, label: "3000ms (Slow)" },
    ],
    [],
  );

  const currentUiFontName = useMemo(
    () => normalizeStoredFontName(settings.ui_font, "ui"),
    [settings.ui_font],
  );
  const currentCodeFontName = useMemo(
    () => normalizeStoredFontName(settings.code_font, "code"),
    [settings.code_font],
  );
  const uiFontOptions = useMemo(
    () => buildFontOptions(systemFonts, "ui"),
    [systemFonts],
  );
  const codeFontOptions = useMemo(
    () => buildFontOptions(systemFonts, "code"),
    [systemFonts],
  );

  const mainActions: Action[] = useMemo(
    () => [
      {
        id: "toggle-autosave",
        label: `Auto-save: ${settings.auto_save ? "On" : "Off"}`,
        description: "Toggle auto-save",
        onSelect: () => {
          onUpdateSettings({ auto_save: !settings.auto_save });
        },
      },
      {
        id: "toggle-vim",
        label: `Vim Mode: ${settings.vim_mode ? "On" : "Off"}`,
        description: "Toggle Vim keybindings",
        onSelect: () => {
          onUpdateSettings({ vim_mode: !settings.vim_mode });
        },
      },
      {
        id: "toggle-line-numbers",
        label: `Line Numbers: ${settings.show_line_numbers ? "On" : "Off"}`,
        description: "Toggle line numbers visibility",
        onSelect: () => {
          onUpdateSettings({ show_line_numbers: !settings.show_line_numbers });
        },
      },
      {
        id: "toggle-relative-lines",
        label: `Relative Line Numbers: ${settings.relative_line_numbers ? "On" : "Off"}`,
        description: "Toggle relative line numbers",
        onSelect: () => {
          onUpdateSettings({ relative_line_numbers: !settings.relative_line_numbers });
        },
      },
      {
        id: "compiler",
        label: `Switch Compiler (Current: ${settings.compiler})`,
        description: "Change LaTeX compiler",
        onSelect: () => {
          setView("compiler");
          setQuery("");
          const currentCompilerIndex = COMPILER_OPTIONS.findIndex((compiler) => compiler === settings.compiler);
          setSelectedIndex(currentCompilerIndex >= 0 ? currentCompilerIndex : 0);
        },
      },
      {
        id: "debounce",
        label: `Compile Debounce (${settings.debounce_ms}ms)`,
        description: "Change compile delay",
        onSelect: () => {
          setView("debounce");
          setQuery("");
          const currentDebounceIndex = debouncePresets.findIndex((preset) => preset.value === settings.debounce_ms);
          setSelectedIndex(currentDebounceIndex >= 0 ? currentDebounceIndex : 0);
        },
      },
      {
        id: "theme",
        label: "Switch Theme",
        description: "Change the editor color theme",
        onSelect: () => {
          setView("themes");
          setQuery("");
          const currentThemeIndex = themes.findIndex((theme) => theme.name === currentThemeName);
          setSelectedIndex(currentThemeIndex >= 0 ? currentThemeIndex : 0);
        },
      },
      {
        id: "ui-font",
        label: `UI Font (Current: ${currentUiFontName})`,
        description: "Change app interface typography",
        onSelect: () => {
          setView("ui-fonts");
          setQuery("");
          const currentUiFontIndex = uiFontOptions.findIndex((font) => font.name === currentUiFontName);
          setSelectedIndex(currentUiFontIndex >= 0 ? currentUiFontIndex : 0);
        },
      },
      {
        id: "code-font",
        label: `Code Font (Current: ${currentCodeFontName})`,
        description: "Change editor monospace font",
        onSelect: () => {
          setView("code-fonts");
          setQuery("");
          const currentCodeFontIndex = codeFontOptions.findIndex((font) => font.name === currentCodeFontName);
          setSelectedIndex(currentCodeFontIndex >= 0 ? currentCodeFontIndex : 0);
        },
      },
      {
        id: "new",
        label: "New Document",
        description: "Create a blank LaTeX document",
        onSelect: () => {
          onNewDocument();
          onClose();
        },
      },
      {
        id: "open",
        label: "Open Document",
        description: "Open a LaTeX file",
        onSelect: () => {
          onOpenDocument();
          onClose();
        },
      },
    ],
    [
      settings,
      onUpdateSettings,
      onNewDocument,
      onOpenDocument,
      onClose,
      debouncePresets,
      themes,
      currentThemeName,
      currentUiFontName,
      currentCodeFontName,
      uiFontOptions,
      codeFontOptions,
    ],
  );

  const themeActions: Action[] = useMemo(
    () =>
      themes.map((t) => ({
        id: `theme-${t.name}`,
        label: t.displayName,
        description: t.name === currentThemeName ? "Current theme" : undefined,
        onSelect: () => {
          onSetTheme(t.name);
          onClose();
        },
      })),
    [themes, currentThemeName, onSetTheme, onClose],
  );

  const compilerActions: Action[] = useMemo(
    () =>
      COMPILER_OPTIONS.map((c) => ({
        id: `compiler-${c}`,
        label: c,
        description: c === settings.compiler ? "Current" : undefined,
        onSelect: () => {
          onUpdateSettings({ compiler: c });
          onClose();
        },
      })),
    [settings.compiler, onUpdateSettings, onClose],
  );

  const debounceActions: Action[] = useMemo(
    () =>
      debouncePresets.map((p) => ({
        id: `debounce-${p.value}`,
        label: p.label,
        description: p.value === settings.debounce_ms ? "Current" : undefined,
        onSelect: () => {
          onUpdateSettings({ debounce_ms: p.value });
          onClose();
        },
      })),
    [debouncePresets, settings.debounce_ms, onUpdateSettings, onClose],
  );

  const uiFontActions: Action[] = useMemo(
    () =>
      uiFontOptions.map((font) => ({
        id: `ui-font-${font.name.toLowerCase().replace(/\s+/g, "-")}`,
        label: font.name,
        description: font.name === currentUiFontName ? "Current" : undefined,
        onSelect: () => {
          onUpdateSettings({ ui_font: font.name });
          onClose();
        },
      })),
    [uiFontOptions, currentUiFontName, onUpdateSettings, onClose],
  );

  const codeFontActions: Action[] = useMemo(
    () =>
      codeFontOptions.map((font) => ({
        id: `code-font-${font.name.toLowerCase().replace(/\s+/g, "-")}`,
        label: font.name,
        description: font.name === currentCodeFontName ? "Current" : undefined,
        onSelect: () => {
          onUpdateSettings({ code_font: font.name });
          onClose();
        },
      })),
    [codeFontOptions, currentCodeFontName, onUpdateSettings, onClose],
  );

  const currentActions =
    view === "themes"
      ? themeActions
      : view === "compiler"
        ? compilerActions
        : view === "debounce"
          ? debounceActions
          : view === "ui-fonts"
            ? uiFontActions
            : view === "code-fonts"
              ? codeFontActions
          : mainActions;

  const filteredActions = useMemo(() => {
    if (!query.trim()) return currentActions;
    const q = query.toLowerCase();
    return currentActions.filter(
      (a) => a.label.toLowerCase().includes(q) || (a.description && a.description.toLowerCase().includes(q)),
    );
  }, [query, currentActions]);

  // Clamp selected index
  useEffect(() => {
    if (selectedIndex >= filteredActions.length) {
      setSelectedIndex(Math.max(0, filteredActions.length - 1));
    }
  }, [filteredActions.length, selectedIndex]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      switch (e.key) {
        case "Escape":
          e.preventDefault();
          if (view !== "main") {
            setView("main");
            setQuery("");
            setSelectedIndex(0);
          } else {
            onClose();
          }
          break;
        case "ArrowDown":
          e.preventDefault();
          setSelectedIndex((i) => Math.min(i + 1, filteredActions.length - 1));
          break;
        case "ArrowUp":
          e.preventDefault();
          setSelectedIndex((i) => Math.max(i - 1, 0));
          break;
        case "Enter":
          e.preventDefault();
          if (filteredActions[selectedIndex]) {
            filteredActions[selectedIndex].onSelect();
          }
          break;
      }
    },
    [view, onClose, filteredActions, selectedIndex],
  );

  if (!isOpen) return null;

  return (
    <div style={overlayStyle} onClick={onClose}>
      <div style={modalStyle} onClick={(e) => e.stopPropagation()} onKeyDown={handleKeyDown}>
        {/* Search input */}
        <div style={inputContainerStyle}>
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSelectedIndex(0);
            }}
            placeholder={
              view === "main"
                ? "Type a command..."
                : view === "themes"
                  ? "Search themes..."
                : view === "compiler"
                  ? "Select compiler..."
                  : view === "debounce"
                    ? "Select debounce..."
                    : view === "ui-fonts"
                      ? "Select UI font..."
                      : view === "code-fonts"
                        ? "Select code font..."
                      : ""
            }
            style={inputStyle}
          />
        </div>

        {/* Action list */}
        <div style={listStyle}>
          {filteredActions.length === 0 && <div style={emptyStyle}>No results found</div>}
          {filteredActions.map((action, i) => (
            <div
              key={action.id}
              style={{
                ...itemStyle,
                background: i === selectedIndex ? "var(--bg-tertiary)" : "transparent",
              }}
              onMouseEnter={() => setSelectedIndex(i)}
              onClick={() => action.onSelect()}
            >
              <div style={itemLabelStyle}>{action.label}</div>
              {action.description && <div style={itemDescriptionStyle}>{action.description}</div>}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

// Styles

const overlayStyle: React.CSSProperties = {
  position: "fixed",
  inset: 0,
  background: "rgba(0, 0, 0, 0.5)",
  backdropFilter: "blur(4px)",
  display: "flex",
  alignItems: "flex-start",
  justifyContent: "center",
  paddingTop: "20vh",
  zIndex: 1000,
};

const modalStyle: React.CSSProperties = {
  width: "100%",
  maxWidth: "500px",
  background: "var(--bg-secondary)",
  border: "1px solid var(--border)",
  borderRadius: "12px",
  overflow: "hidden",
  boxShadow: "0 16px 48px rgba(0, 0, 0, 0.4)",
};

const inputContainerStyle: React.CSSProperties = {
  padding: "12px 16px",
  borderBottom: "1px solid var(--border)",
};

const inputStyle: React.CSSProperties = {
  width: "100%",
  background: "transparent",
  border: "none",
  outline: "none",
  color: "var(--text-primary)",
  fontFamily: "var(--font-sans)",
  fontSize: "14px",
  lineHeight: "1.5",
};

const listStyle: React.CSSProperties = {
  maxHeight: "300px",
  overflowY: "auto",
  padding: "6px 0",
};

const itemStyle: React.CSSProperties = {
  padding: "10px 16px",
  cursor: "pointer",
  transition: "background 0.1s ease",
};

const itemLabelStyle: React.CSSProperties = {
  color: "var(--text-primary)",
  fontSize: "13px",
  fontFamily: "var(--font-sans)",
  fontWeight: 500,
};

const itemDescriptionStyle: React.CSSProperties = {
  color: "var(--text-muted)",
  fontSize: "12px",
  fontFamily: "var(--font-sans)",
  marginTop: "2px",
};

const emptyStyle: React.CSSProperties = {
  padding: "24px 16px",
  textAlign: "center",
  color: "var(--text-muted)",
  fontSize: "13px",
  fontFamily: "var(--font-sans)",
};

export default CommandPalette;
