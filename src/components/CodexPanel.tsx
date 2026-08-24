import React, { useCallback, useEffect, useRef, useState } from "react";
import type { CodexStatus } from "../types";

interface ChatMessage {
  id: string;
  role: "user" | "assistant" | "error" | "system";
  content: string;
  timestamp: number;
}

interface CodexPanelProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (prompt: string) => Promise<void>;
  status: CodexStatus | null;
  isLoadingStatus: boolean;
  isRunning: boolean;
  currentFilePath: string | null;
  isDirty: boolean;
  lastMessage: string | null;
  lastError: string | null;
}

const SUGGESTIONS = [
  "Rewrite into clearer lecture notes",
  "Fix LaTeX mistakes & formatting",
  "Add worked examples after each definition",
];

const CodexPanel: React.FC<CodexPanelProps> = ({
  isOpen,
  onClose,
  onSubmit,
  status,
  isLoadingStatus,
  isRunning,
  currentFilePath,
  isDirty,
  lastMessage,
  lastError,
}) => {
  const [prompt, setPrompt] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const prevLastMessage = useRef(lastMessage);
  const prevLastError = useRef(lastError);

  // Focus input when panel opens
  useEffect(() => {
    if (!isOpen) return;
    requestAnimationFrame(() => inputRef.current?.focus());
  }, [isOpen]);

  // Escape to close
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [isOpen, onClose]);

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Track external lastMessage / lastError changes and push them as chat messages
  useEffect(() => {
    if (lastMessage && lastMessage !== prevLastMessage.current) {
      setMessages((prev) => [
        ...prev,
        { id: crypto.randomUUID(), role: "assistant", content: lastMessage, timestamp: Date.now() },
      ]);
    }
    prevLastMessage.current = lastMessage;
  }, [lastMessage]);

  useEffect(() => {
    if (lastError && lastError !== prevLastError.current) {
      setMessages((prev) => [
        ...prev,
        { id: crypto.randomUUID(), role: "error", content: lastError, timestamp: Date.now() },
      ]);
    }
    prevLastError.current = lastError;
  }, [lastError]);

  const isReady = !!currentFilePath && !!status?.available;

  const handleSend = useCallback(async () => {
    const text = prompt.trim();
    if (!text || !isReady || isRunning) return;

    setMessages((prev) => [
      ...prev,
      { id: crypto.randomUUID(), role: "user", content: text, timestamp: Date.now() },
    ]);
    setPrompt("");

    try {
      await onSubmit(text);
    } catch {
      // error is handled via lastError prop
    }
  }, [prompt, isReady, isRunning, onSubmit]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        handleSend();
      }
    },
    [handleSend],
  );

  if (!isOpen) return null;

  const statusText = isLoadingStatus
    ? "Checking..."
    : status?.available
      ? status.version ?? "Ready"
      : status?.detail ?? "Unavailable";

  const fileName = currentFilePath?.split("/").pop() ?? null;

  return (
    <div style={overlayStyle} onClick={onClose}>
      <div style={panelStyle} onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div style={headerStyle}>
          <div style={headerLeftStyle}>
            <div style={brandStyle}>Codex</div>
            <div style={statusBadgeStyle}>
              <span
                style={{
                  ...dotStyle,
                  background: status?.available
                    ? "var(--success)"
                    : "var(--text-muted)",
                }}
              />
              {statusText}
            </div>
          </div>
          <button onClick={onClose} style={closeBtnStyle} aria-label="Close">
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
              <path d="M3 3l8 8M11 3l-8 8" />
            </svg>
          </button>
        </div>

        {/* File context bar */}
        {fileName && (
          <div style={contextBarStyle}>
            <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
              <path d="M2 4v10h10" />
              <rect x="4" y="2" width="10" height="10" rx="1" />
            </svg>
            <span style={contextFileStyle}>{fileName}</span>
            {isDirty && <span style={dirtyBadgeStyle}>unsaved</span>}
          </div>
        )}

        {/* Messages area */}
        <div style={messagesAreaStyle}>
          {messages.length === 0 && (
            <div style={emptyStateStyle}>
              <div style={emptyTitleStyle}>Ask Codex to edit your LaTeX</div>
              <div style={emptySubStyle}>
                {!currentFilePath
                  ? "Open a saved .tex file first."
                  : !status?.available
                    ? "Codex CLI is not available."
                    : "Describe what you want changed and Codex will edit the file directly."}
              </div>
            </div>
          )}
          {messages.map((msg) => (
            <div
              key={msg.id}
              style={{
                ...messageBubbleStyle,
                ...(msg.role === "user" ? userBubbleStyle : {}),
                ...(msg.role === "error" ? errorBubbleStyle : {}),
                ...(msg.role === "assistant" ? assistantBubbleStyle : {}),
                alignSelf: msg.role === "user" ? "flex-end" : "flex-start",
              }}
            >
              {msg.role !== "user" && (
                <span style={bubbleLabelStyle}>
                  {msg.role === "error" ? "Error" : "Codex"}
                </span>
              )}
              <span style={bubbleTextStyle}>{msg.content}</span>
            </div>
          ))}
          {isRunning && (
            <div style={{ ...messageBubbleStyle, ...assistantBubbleStyle, alignSelf: "flex-start" }}>
              <span style={bubbleLabelStyle}>Codex</span>
              <span style={typingStyle}>
                <span style={typingDotStyle} />
                <span style={{ ...typingDotStyle, animationDelay: "0.15s" }} />
                <span style={{ ...typingDotStyle, animationDelay: "0.3s" }} />
              </span>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Suggestions (shown only when empty) */}
        {messages.length === 0 && isReady && (
          <div style={suggestionsRowStyle}>
            {SUGGESTIONS.map((s) => (
              <button
                key={s}
                onClick={() => setPrompt(s)}
                style={suggestionChipStyle}
                disabled={isRunning}
              >
                {s}
              </button>
            ))}
          </div>
        )}

        {/* Input area */}
        <div style={inputAreaStyle}>
          <textarea
            ref={inputRef}
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={isReady ? "Describe what to change..." : "Open a .tex file to get started"}
            disabled={!isReady || isRunning}
            rows={1}
            style={inputStyle}
          />
          <button
            onClick={handleSend}
            disabled={!isReady || isRunning || !prompt.trim()}
            style={{
              ...sendBtnStyle,
              ...(!isReady || isRunning || !prompt.trim() ? sendBtnDisabledStyle : {}),
            }}
            aria-label="Send"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M8 12V4M4 7l4-4 4 4" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
};

/* ---------- animation keyframes injected once ---------- */

const STYLE_ID = "codex-panel-keyframes";
if (typeof document !== "undefined" && !document.getElementById(STYLE_ID)) {
  const style = document.createElement("style");
  style.id = STYLE_ID;
  style.textContent = `
    @keyframes codex-fade-in {
      from { opacity: 0; transform: translateY(12px) scale(0.98); }
      to   { opacity: 1; transform: translateY(0) scale(1); }
    }
    @keyframes codex-dot-pulse {
      0%, 60%, 100% { opacity: 0.25; }
      30% { opacity: 1; }
    }
  `;
  document.head.appendChild(style);
}

/* ---------- styles ---------- */

const overlayStyle: React.CSSProperties = {
  position: "fixed",
  top: "40px", // below the header
  left: 0,
  right: 0,
  bottom: 0,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  background: "rgba(0, 0, 0, 0.25)",
  backdropFilter: "blur(16px)",
  WebkitBackdropFilter: "blur(16px)",
  zIndex: 1100,
};

const panelStyle: React.CSSProperties = {
  width: "min(520px, calc(100vw - 48px))",
  maxHeight: "calc(100vh - 80px)",
  display: "flex",
  flexDirection: "column",
  borderRadius: "16px",
  border: "1px solid var(--border)",
  background: "var(--bg-secondary)",
  boxShadow: "0 24px 64px rgba(0, 0, 0, 0.4), 0 0 0 1px var(--border)",
  overflow: "hidden",
  animation: "codex-fade-in 0.2s ease-out",
};

const headerStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  padding: "14px 16px 10px",
  borderBottom: "1px solid var(--border)",
};

const headerLeftStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: "10px",
};

const brandStyle: React.CSSProperties = {
  fontFamily: "var(--font-sans)",
  fontSize: "14px",
  fontWeight: 600,
  color: "var(--text-primary)",
};

const statusBadgeStyle: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: "5px",
  fontFamily: "var(--font-mono)",
  fontSize: "11px",
  color: "var(--text-muted)",
  padding: "2px 8px",
  borderRadius: "999px",
  background: "var(--bg-tertiary)",
  border: "1px solid var(--border)",
};

const dotStyle: React.CSSProperties = {
  width: "6px",
  height: "6px",
  borderRadius: "50%",
  flexShrink: 0,
};

const closeBtnStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  width: "28px",
  height: "28px",
  borderRadius: "8px",
  border: "1px solid var(--border)",
  background: "transparent",
  color: "var(--text-muted)",
  cursor: "pointer",
};

const contextBarStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: "6px",
  padding: "8px 16px",
  borderBottom: "1px solid var(--border)",
  background: "var(--bg-tertiary)",
  color: "var(--text-muted)",
};

const contextFileStyle: React.CSSProperties = {
  fontFamily: "var(--font-mono)",
  fontSize: "11px",
  color: "var(--text-secondary)",
};

const dirtyBadgeStyle: React.CSSProperties = {
  fontFamily: "var(--font-mono)",
  fontSize: "10px",
  color: "var(--warning)",
  padding: "1px 6px",
  borderRadius: "4px",
  background: "var(--bg-primary)",
  border: "1px solid var(--border)",
};

const messagesAreaStyle: React.CSSProperties = {
  flex: 1,
  minHeight: "180px",
  maxHeight: "400px",
  overflowY: "auto",
  padding: "16px",
  display: "flex",
  flexDirection: "column",
  gap: "10px",
};

const emptyStateStyle: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  justifyContent: "center",
  flex: 1,
  gap: "6px",
  padding: "32px 16px",
  textAlign: "center",
};

const emptyTitleStyle: React.CSSProperties = {
  fontFamily: "var(--font-sans)",
  fontSize: "14px",
  fontWeight: 600,
  color: "var(--text-primary)",
};

const emptySubStyle: React.CSSProperties = {
  fontFamily: "var(--font-sans)",
  fontSize: "12px",
  color: "var(--text-muted)",
  lineHeight: 1.5,
  maxWidth: "280px",
};

const messageBubbleStyle: React.CSSProperties = {
  maxWidth: "85%",
  padding: "10px 14px",
  borderRadius: "12px",
  display: "flex",
  flexDirection: "column",
  gap: "2px",
};

const userBubbleStyle: React.CSSProperties = {
  background: "var(--accent)",
  color: "var(--bg-primary)",
  borderBottomRightRadius: "4px",
};

const assistantBubbleStyle: React.CSSProperties = {
  background: "var(--bg-tertiary)",
  border: "1px solid var(--border)",
  borderBottomLeftRadius: "4px",
};

const errorBubbleStyle: React.CSSProperties = {
  background: "var(--bg-tertiary)",
  border: "1px solid var(--error)",
  borderBottomLeftRadius: "4px",
};

const bubbleLabelStyle: React.CSSProperties = {
  fontFamily: "var(--font-mono)",
  fontSize: "10px",
  textTransform: "uppercase",
  letterSpacing: "0.05em",
  color: "var(--text-muted)",
  marginBottom: "2px",
};

const bubbleTextStyle: React.CSSProperties = {
  fontFamily: "var(--font-sans)",
  fontSize: "13px",
  lineHeight: 1.5,
  whiteSpace: "pre-wrap",
  wordBreak: "break-word",
};

const typingStyle: React.CSSProperties = {
  display: "flex",
  gap: "4px",
  padding: "4px 0",
};

const typingDotStyle: React.CSSProperties = {
  width: "5px",
  height: "5px",
  borderRadius: "50%",
  background: "var(--text-muted)",
  animation: "codex-dot-pulse 0.9s ease-in-out infinite",
};

const suggestionsRowStyle: React.CSSProperties = {
  display: "flex",
  flexWrap: "wrap",
  gap: "6px",
  padding: "0 16px 12px",
};

const suggestionChipStyle: React.CSSProperties = {
  padding: "6px 10px",
  borderRadius: "8px",
  border: "1px solid var(--border)",
  background: "var(--bg-tertiary)",
  color: "var(--text-secondary)",
  cursor: "pointer",
  fontFamily: "var(--font-sans)",
  fontSize: "11px",
  lineHeight: 1.3,
  textAlign: "left",
  transition: "border-color 0.15s, color 0.15s",
};

const inputAreaStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "flex-end",
  gap: "8px",
  padding: "12px 16px",
  borderTop: "1px solid var(--border)",
  background: "var(--bg-primary)",
};

const inputStyle: React.CSSProperties = {
  flex: 1,
  resize: "none",
  border: "1px solid var(--border)",
  borderRadius: "10px",
  background: "var(--bg-secondary)",
  color: "var(--text-primary)",
  padding: "10px 12px",
  fontFamily: "var(--font-sans)",
  fontSize: "13px",
  lineHeight: 1.4,
  outline: "none",
  minHeight: "38px",
  maxHeight: "120px",
};

const sendBtnStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  width: "36px",
  height: "38px",
  borderRadius: "10px",
  border: "1px solid var(--accent)",
  background: "var(--accent)",
  color: "var(--bg-primary)",
  cursor: "pointer",
  flexShrink: 0,
  transition: "opacity 0.15s",
};

const sendBtnDisabledStyle: React.CSSProperties = {
  opacity: 0.3,
  cursor: "default",
  border: "1px solid var(--border)",
  background: "var(--bg-tertiary)",
  color: "var(--text-muted)",
};

export default CodexPanel;
