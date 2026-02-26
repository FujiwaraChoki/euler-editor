import React, { useState, useEffect, useRef, useCallback, useMemo } from "react";
import type { EulerConfig, Theme } from "../types";

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
}

type View = "main" | "settings" | "themes";

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

  const mainActions: Action[] = useMemo(
    () => [
      {
        id: "settings",
        label: "Settings",
        description: "Configure compiler, auto-save, and more",
        onSelect: () => {
          setView("settings");
          setQuery("");
          setSelectedIndex(0);
        },
      },
      {
        id: "theme",
        label: "Switch Theme",
        description: "Change the editor color theme",
        onSelect: () => {
          setView("themes");
          setQuery("");
          setSelectedIndex(0);
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
    [onNewDocument, onOpenDocument, onClose]
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
    [themes, currentThemeName, onSetTheme, onClose]
  );

  const currentActions = view === "main" ? mainActions : view === "themes" ? themeActions : [];

  const filteredActions = useMemo(() => {
    if (!query.trim()) return currentActions;
    const q = query.toLowerCase();
    return currentActions.filter(
      (a) =>
        a.label.toLowerCase().includes(q) ||
        (a.description && a.description.toLowerCase().includes(q))
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
    [view, onClose, filteredActions, selectedIndex]
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
                : ""
            }
            style={inputStyle}
          />
        </div>

        {/* Settings panel */}
        {view === "settings" && (
          <div style={settingsPanelStyle}>
            <div style={settingsHeaderStyle}>Settings</div>

            {/* Compiler */}
            <div style={settingRowStyle}>
              <label style={settingLabelStyle}>Compiler</label>
              <select
                value={settings.compiler}
                onChange={(e) => onUpdateSettings({ compiler: e.target.value })}
                style={selectStyle}
              >
                <option value="pdflatex">pdflatex</option>
                <option value="xelatex">xelatex</option>
                <option value="lualatex">lualatex</option>
              </select>
            </div>

            {/* Auto-save */}
            <div style={settingRowStyle}>
              <label style={settingLabelStyle}>Auto-save</label>
              <button
                onClick={() => onUpdateSettings({ auto_save: !settings.auto_save })}
                style={{
                  ...toggleStyle,
                  background: settings.auto_save ? "var(--success)" : "var(--bg-tertiary)",
                }}
              >
                <div
                  style={{
                    ...toggleKnobStyle,
                    transform: settings.auto_save ? "translateX(16px)" : "translateX(0)",
                  }}
                />
              </button>
            </div>

            {/* Vim mode */}
            <div style={settingRowStyle}>
              <label style={settingLabelStyle}>Vim mode</label>
              <button
                onClick={() => onUpdateSettings({ vim_mode: !settings.vim_mode })}
                style={{
                  ...toggleStyle,
                  background: settings.vim_mode ? "var(--success)" : "var(--bg-tertiary)",
                }}
              >
                <div
                  style={{
                    ...toggleKnobStyle,
                    transform: settings.vim_mode ? "translateX(16px)" : "translateX(0)",
                  }}
                />
              </button>
            </div>

            {/* Debounce */}
            <div style={settingRowStyle}>
              <label style={settingLabelStyle}>
                Debounce ({settings.debounce_ms}ms)
              </label>
              <input
                type="range"
                min={200}
                max={3000}
                step={100}
                value={settings.debounce_ms}
                onChange={(e) =>
                  onUpdateSettings({ debounce_ms: parseInt(e.target.value, 10) })
                }
                style={rangeStyle}
              />
            </div>

            <div style={{ padding: "12px 16px", borderTop: "1px solid var(--border)" }}>
              <button onClick={onClose} style={doneButtonStyle}>
                Done
              </button>
            </div>
          </div>
        )}

        {/* Action list */}
        {view !== "settings" && (
          <div style={listStyle}>
            {filteredActions.length === 0 && (
              <div style={emptyStyle}>No results found</div>
            )}
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
                {action.description && (
                  <div style={itemDescriptionStyle}>{action.description}</div>
                )}
              </div>
            ))}
          </div>
        )}
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

const settingsPanelStyle: React.CSSProperties = {
  maxHeight: "400px",
  overflowY: "auto",
};

const settingsHeaderStyle: React.CSSProperties = {
  padding: "12px 16px 8px",
  fontSize: "11px",
  fontWeight: 500,
  color: "var(--text-muted)",
  fontFamily: "var(--font-mono)",
  textTransform: "uppercase",
  letterSpacing: "0.05em",
};

const settingRowStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  padding: "10px 16px",
  borderBottom: "1px solid var(--border)",
};

const settingLabelStyle: React.CSSProperties = {
  color: "var(--text-primary)",
  fontSize: "13px",
  fontFamily: "var(--font-sans)",
};

const selectStyle: React.CSSProperties = {
  background: "var(--bg-tertiary)",
  border: "1px solid var(--border)",
  borderRadius: "6px",
  color: "var(--text-primary)",
  fontFamily: "var(--font-mono)",
  fontSize: "12px",
  padding: "4px 8px",
  outline: "none",
  cursor: "pointer",
};

const toggleStyle: React.CSSProperties = {
  width: "36px",
  height: "20px",
  borderRadius: "10px",
  border: "none",
  cursor: "pointer",
  position: "relative",
  padding: "2px",
  transition: "background 0.2s ease",
};

const toggleKnobStyle: React.CSSProperties = {
  width: "16px",
  height: "16px",
  borderRadius: "50%",
  background: "white",
  transition: "transform 0.2s ease",
};

const rangeStyle: React.CSSProperties = {
  width: "140px",
  accentColor: "var(--accent)",
};

const doneButtonStyle: React.CSSProperties = {
  width: "100%",
  padding: "8px 16px",
  background: "var(--bg-tertiary)",
  border: "1px solid var(--border)",
  borderRadius: "6px",
  color: "var(--text-primary)",
  fontFamily: "var(--font-sans)",
  fontSize: "13px",
  cursor: "pointer",
  transition: "background 0.15s ease",
};

export default CommandPalette;
