import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";

type ConnectionState = "disconnected" | "connecting" | "ready" | "error";

interface ChatMessage {
  id: string;
  role: "user" | "assistant" | "system" | "tool";
  text: string;
  streaming?: boolean;
}

interface CodexChatProps {
  serverUrl: string | null;
  workingDirectory: string | null;
  onFilesChanged?: (paths: string[]) => void;
}

type JsonRpcRequest = {
  id: number;
  method: string;
  params: unknown;
};

type JsonRpcResponse = {
  id: number;
  result?: unknown;
  error?: { message?: string };
};

type JsonRpcNotification = {
  method: string;
  params?: any;
};

interface PersistedChatState {
  threadId: string | null;
  messages: ChatMessage[];
  updatedAt: number;
}

const getStorageKey = (workingDirectory: string): string => {
  return `euler.codex.chat.${encodeURIComponent(workingDirectory)}`;
};

const readPersistedChat = (workingDirectory: string): PersistedChatState | null => {
  try {
    const raw = window.localStorage.getItem(getStorageKey(workingDirectory));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as PersistedChatState;
    if (!Array.isArray(parsed.messages)) return null;
    return {
      threadId: typeof parsed.threadId === "string" ? parsed.threadId : null,
      messages: parsed.messages,
      updatedAt: typeof parsed.updatedAt === "number" ? parsed.updatedAt : Date.now(),
    };
  } catch {
    return null;
  }
};

const writePersistedChat = (workingDirectory: string, state: PersistedChatState): void => {
  try {
    window.localStorage.setItem(getStorageKey(workingDirectory), JSON.stringify(state));
  } catch {
    // Ignore persistence failures (storage limits/private mode).
  }
};

const isToolItemType = (type: string): boolean => {
  return (
    type === "commandExecution" ||
    type === "fileChange" ||
    type === "mcpToolCall" ||
    type === "dynamicToolCall" ||
    type === "collabAgentToolCall"
  );
};

const formatToolItem = (item: any, phase: "started" | "completed"): string => {
  const type = item?.type;
  if (!type) return "Tool activity";

  if (type === "commandExecution") {
    const status = item?.status ?? (phase === "started" ? "inProgress" : "completed");
    const command = item?.command ?? "(unknown command)";
    const exitCode = typeof item?.exitCode === "number" ? ` (exit ${item.exitCode})` : "";
    return `command (${status})\n${command}${exitCode}`;
  }

  if (type === "fileChange") {
    const status = item?.status ?? (phase === "started" ? "inProgress" : "completed");
    const count = Array.isArray(item?.changes) ? item.changes.length : 0;
    return `fileChange (${status})\n${count} file change${count === 1 ? "" : "s"}`;
  }

  if (type === "mcpToolCall") {
    const status = item?.status ?? (phase === "started" ? "inProgress" : "completed");
    const server = item?.server ?? "mcp";
    const tool = item?.tool ?? "tool";
    return `mcpToolCall (${status})\n${server}.${tool}`;
  }

  if (type === "dynamicToolCall") {
    const status = item?.status ?? (phase === "started" ? "inProgress" : "completed");
    const tool = item?.tool ?? "tool";
    return `dynamicToolCall (${status})\n${tool}`;
  }

  if (type === "collabAgentToolCall") {
    const status = item?.status ?? (phase === "started" ? "inProgress" : "completed");
    const tool = item?.tool ?? "agentTool";
    return `collabAgentToolCall (${status})\n${tool}`;
  }

  return `${type} (${phase})`;
};

const extractFileChangePaths = (item: any): string[] => {
  const changes = Array.isArray(item?.changes) ? item.changes : [];
  const paths = changes
    .map((change: any) => {
      if (!change || typeof change !== "object") return null;
      if (typeof change.path === "string") return change.path;
      if (typeof change.filePath === "string") return change.filePath;
      if (typeof change.newPath === "string") return change.newPath;
      if (typeof change.oldPath === "string") return change.oldPath;
      return null;
    })
    .filter((path: string | null): path is string => typeof path === "string" && path.length > 0);

  return Array.from(new Set(paths));
};

const CodexChat: React.FC<CodexChatProps> = ({ serverUrl, workingDirectory, onFilesChanged }) => {
  const [connectionState, setConnectionState] = useState<ConnectionState>("disconnected");
  const [threadId, setThreadId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [lastCloseInfo, setLastCloseInfo] = useState<string | null>(null);

  const wsRef = useRef<WebSocket | null>(null);
  const requestIdRef = useRef(1);
  const pendingRequestsRef = useRef(new Map<number, { resolve: (value: any) => void; reject: (error: Error) => void }>());
  const assistantMessageByItemRef = useRef(new Map<string, string>());
  const toolMessageByItemRef = useRef(new Map<string, string>());
  const listRef = useRef<HTMLDivElement | null>(null);
  const reconnectTimerRef = useRef<number | null>(null);

  const connected = connectionState === "ready";

  const appendMessage = useCallback((message: ChatMessage) => {
    setMessages((previous) => [...previous, message]);
  }, []);

  const updateMessage = useCallback((id: string, updater: (prev: ChatMessage) => ChatMessage) => {
    setMessages((previous) => previous.map((message) => (message.id === id ? updater(message) : message)));
  }, []);

  const sendRequest = useCallback((ws: WebSocket, method: string, params: unknown): Promise<any> => {
    if (ws.readyState !== WebSocket.OPEN) {
      return Promise.reject(new Error("Codex chat is not connected"));
    }

    const id = requestIdRef.current;
    requestIdRef.current += 1;

    const payload: JsonRpcRequest = { id, method, params };
    ws.send(JSON.stringify(payload));

    return new Promise((resolve, reject) => {
      pendingRequestsRef.current.set(id, { resolve, reject });
    });
  }, []);

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight });
  }, [messages]);

  useEffect(() => {
    if (!serverUrl || !workingDirectory) {
      setConnectionState("disconnected");
      return;
    }

    const restored = readPersistedChat(workingDirectory);
    const restoredThreadId = restored?.threadId ?? null;
    setMessages(restored?.messages ?? []);
    setThreadId(restoredThreadId);

    let disposed = false;
    let reconnectAttempt = 0;

    assistantMessageByItemRef.current.clear();
    toolMessageByItemRef.current.clear();

    const failPending = (error: Error) => {
      for (const [, pending] of pendingRequestsRef.current) {
        pending.reject(error);
      }
      pendingRequestsRef.current.clear();
    };

    const bindSocket = (ws: WebSocket) => {
      ws.onmessage = (event) => {
      if (wsRef.current !== ws) return;
      let parsed: JsonRpcResponse | JsonRpcNotification;
      try {
        parsed = JSON.parse(String(event.data));
      } catch {
        return;
      }

      if (typeof (parsed as JsonRpcResponse).id === "number" || typeof (parsed as any).id === "string") {
        const response = parsed as JsonRpcResponse;
        const responseId = Number((parsed as any).id);
        const pending = pendingRequestsRef.current.get(responseId);
        if (!pending) return;

        pendingRequestsRef.current.delete(responseId);
        if (response.error) {
          pending.reject(new Error(response.error.message ?? "Request failed"));
        } else {
          pending.resolve(response.result);
        }
        return;
      }

      const notification = parsed as JsonRpcNotification;

      if (notification.method === "item/agentMessage/delta") {
        const { itemId, delta } = notification.params ?? {};
        if (typeof itemId !== "string" || typeof delta !== "string") return;

        const existingMessageId = assistantMessageByItemRef.current.get(itemId);
        if (existingMessageId) {
          updateMessage(existingMessageId, (message) => ({
            ...message,
            text: `${message.text}${delta}`,
            streaming: true,
          }));
          return;
        }

        const messageId = `assistant-${itemId}`;
        assistantMessageByItemRef.current.set(itemId, messageId);
        appendMessage({ id: messageId, role: "assistant", text: delta, streaming: true });
        return;
      }

      if (notification.method === "item/completed") {
        const item = notification.params?.item;
        if (typeof item?.id !== "string") return;

        if (item?.type === "agentMessage") {
          const messageId = assistantMessageByItemRef.current.get(item.id) ?? `assistant-${item.id}`;
          assistantMessageByItemRef.current.set(item.id, messageId);

          const finalText = typeof item.text === "string" ? item.text : "";
          setMessages((previous) => {
            const existing = previous.find((message) => message.id === messageId);
            if (!existing) {
              return [...previous, { id: messageId, role: "assistant", text: finalText, streaming: false }];
            }
            return previous.map((message) =>
              message.id === messageId ? { ...message, text: finalText || message.text, streaming: false } : message,
            );
          });
          return;
        }

        if (typeof item?.type === "string" && isToolItemType(item.type)) {
          const messageId = toolMessageByItemRef.current.get(item.id) ?? `tool-${item.id}`;
          toolMessageByItemRef.current.set(item.id, messageId);
          const text = formatToolItem(item, "completed");

          setMessages((previous) => {
            const existing = previous.find((message) => message.id === messageId);
            if (!existing) {
              return [...previous, { id: messageId, role: "tool", text, streaming: false }];
            }
            return previous.map((message) =>
              message.id === messageId ? { ...message, text, streaming: false } : message,
            );
          });

          if (item.type === "fileChange") {
            const changedPaths = extractFileChangePaths(item);
            if (changedPaths.length > 0) {
              onFilesChanged?.(changedPaths);
            }
          }
        }
        return;
      }

      if (notification.method === "item/started") {
        const item = notification.params?.item;
        if (typeof item?.id !== "string" || typeof item?.type !== "string") return;
        if (!isToolItemType(item.type)) return;

        const messageId = toolMessageByItemRef.current.get(item.id) ?? `tool-${item.id}`;
        toolMessageByItemRef.current.set(item.id, messageId);
        const text = formatToolItem(item, "started");

        setMessages((previous) => {
          const existing = previous.find((message) => message.id === messageId);
          if (!existing) {
            return [...previous, { id: messageId, role: "tool", text, streaming: true }];
          }
          return previous.map((message) =>
            message.id === messageId ? { ...message, text, streaming: true } : message,
          );
        });
        return;
      }

      if (notification.method === "turn/completed") {
        setIsSending(false);
        return;
      }

      if (notification.method === "error") {
        const message = notification.params?.error?.message;
        if (typeof message === "string") {
          appendMessage({ id: `system-${Date.now()}`, role: "system", text: message });
        }
        setIsSending(false);
      }
    };

      ws.onerror = () => {};

      ws.onclose = (event) => {
        if (wsRef.current !== ws) return;
        if (disposed) return;
        setConnectionState("disconnected");
        setLastCloseInfo(`code ${event.code}${event.reason ? `: ${event.reason}` : ""}`);
        setIsSending(false);
        failPending(new Error("Codex chat connection closed"));

        reconnectAttempt += 1;
        const delay = Math.min(2000, 250 * reconnectAttempt);
        reconnectTimerRef.current = window.setTimeout(() => {
          connect();
        }, delay);
      };
    };

    const startSession = async (ws: WebSocket) => {
      await sendRequest(ws, "initialize", {
        clientInfo: { name: "euler-editor", title: "Euler Editor", version: "0.1.0" },
        capabilities: { experimentalApi: false },
      });

      ws.send(JSON.stringify({ method: "initialized", params: {} }));

      let started: any;
      if (restoredThreadId) {
        try {
          started = await sendRequest(ws, "thread/resume", {
            threadId: restoredThreadId,
          });
        } catch {
          started = await sendRequest(ws, "thread/start", {
            cwd: workingDirectory,
          });
          appendMessage({
            id: `system-${Date.now()}`,
            role: "system",
            text: "Previous chat session could not be resumed. Started a new thread.",
          });
        }
      } else {
        started = await sendRequest(ws, "thread/start", {
          cwd: workingDirectory,
        });
      }

      const newThreadId = started?.thread?.id;
      if (!newThreadId || typeof newThreadId !== "string") {
        throw new Error("Codex did not return a thread ID");
      }

      reconnectAttempt = 0;
      setThreadId(newThreadId);
      setConnectionState("ready");
    };

    const connect = () => {
      if (disposed) return;

      setConnectionState("connecting");
      const ws = new WebSocket(serverUrl);
      wsRef.current = ws;
      bindSocket(ws);

      ws.onopen = () => {
        setLastCloseInfo(null);
        startSession(ws).catch((error) => {
          setConnectionState("error");
          appendMessage({
            id: `system-${Date.now()}`,
            role: "system",
            text: `Failed to initialize Codex chat: ${String(error)}`,
          });
          ws.close();
        });
      };
    };

    connect();

    return () => {
      disposed = true;
      if (reconnectTimerRef.current !== null) {
        window.clearTimeout(reconnectTimerRef.current);
        reconnectTimerRef.current = null;
      }
      wsRef.current?.close();
      wsRef.current = null;
      failPending(new Error("Codex chat connection replaced"));
    };
  }, [appendMessage, onFilesChanged, sendRequest, serverUrl, updateMessage, workingDirectory]);

  useEffect(() => {
    if (!workingDirectory) return;
    writePersistedChat(workingDirectory, {
      threadId,
      messages: messages.slice(-300),
      updatedAt: Date.now(),
    });
  }, [messages, threadId, workingDirectory]);

  const handleSend = useCallback(() => {
    const text = input.trim();
    if (!text || !threadId || !connected || isSending) return;

    setInput("");
    setIsSending(true);
    appendMessage({ id: `user-${Date.now()}`, role: "user", text });

    const ws = wsRef.current;
    if (!ws || ws.readyState !== WebSocket.OPEN) {
      appendMessage({
        id: `system-${Date.now()}`,
        role: "system",
        text: "Codex chat is disconnected. Start the server again.",
      });
      setIsSending(false);
      return;
    }

    sendRequest(ws, "turn/start", {
      threadId,
      cwd: workingDirectory,
      input: [{ type: "text", text }],
    }).catch((error) => {
      appendMessage({
        id: `system-${Date.now()}`,
        role: "system",
        text: `Failed to send message: ${String(error)}`,
      });
      setIsSending(false);
    });
  }, [appendMessage, connected, input, isSending, sendRequest, threadId, workingDirectory]);

  const statusLabel = useMemo(() => {
    if (connectionState === "ready") return `Connected${threadId ? ` (${threadId.slice(0, 8)}...)` : ""}`;
    if (connectionState === "connecting") return "Connecting...";
    if (connectionState === "error") return "Connection error";
    if (lastCloseInfo) return `Disconnected (${lastCloseInfo})`;
    return "Disconnected";
  }, [connectionState, lastCloseInfo, threadId]);

  return (
    <div style={containerStyle}>
      <div style={topBarStyle}>
        <span style={titleStyle}>Codex Chat</span>
        <span style={statusStyle(connectionState)}>{statusLabel}</span>
      </div>

      <div ref={listRef} style={messagesStyle}>
        {messages.length === 0 ? (
          <div style={emptyStyle}>Send a prompt to let Codex edit this folder.</div>
        ) : (
          messages.map((message) => (
            <div key={message.id} style={bubbleStyle(message.role)}>
              <div style={roleStyle}>{message.role}</div>
              <div style={textStyle}>{message.text || (message.streaming ? "..." : "")}</div>
            </div>
          ))
        )}
      </div>

      <div style={composerStyle}>
        <input
          value={input}
          onChange={(event) => setInput(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              handleSend();
            }
          }}
          placeholder="Ask Codex to edit files..."
          disabled={!connected || isSending}
          style={inputStyle}
        />
        <button
          onClick={handleSend}
          disabled={!connected || !input.trim() || isSending}
          style={sendButtonStyle}
        >
          {isSending ? "..." : "Send"}
        </button>
      </div>
    </div>
  );
};

const containerStyle: React.CSSProperties = {
  height: "100%",
  display: "flex",
  flexDirection: "column",
  background: "var(--bg-secondary)",
};

const topBarStyle: React.CSSProperties = {
  height: "32px",
  minHeight: "32px",
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  padding: "0 12px",
  borderBottom: "1px solid var(--border)",
};

const titleStyle: React.CSSProperties = {
  fontFamily: "var(--font-sans)",
  fontSize: "12px",
  color: "var(--text-primary)",
};

const statusStyle = (state: ConnectionState): React.CSSProperties => ({
  fontFamily: "var(--font-mono)",
  fontSize: "11px",
  color: state === "ready" ? "var(--success)" : state === "error" ? "var(--error)" : "var(--text-muted)",
});

const messagesStyle: React.CSSProperties = {
  flex: 1,
  minHeight: 0,
  overflowY: "auto",
  padding: "10px",
  display: "flex",
  flexDirection: "column",
  gap: "8px",
};

const bubbleStyle = (role: ChatMessage["role"]): React.CSSProperties => ({
  border: "1px solid var(--border)",
  borderRadius: "8px",
  padding: "8px 10px",
  background:
    role === "user"
      ? "var(--bg-tertiary)"
      : role === "assistant"
        ? "rgba(80, 227, 194, 0.06)"
        : role === "tool"
          ? "rgba(74, 144, 226, 0.08)"
        : "rgba(245, 166, 35, 0.08)",
});

const roleStyle: React.CSSProperties = {
  fontFamily: "var(--font-mono)",
  fontSize: "10px",
  textTransform: "uppercase",
  letterSpacing: "0.04em",
  color: "var(--text-muted)",
  marginBottom: "4px",
};

const textStyle: React.CSSProperties = {
  fontFamily: "var(--font-sans)",
  fontSize: "12px",
  lineHeight: 1.4,
  color: "var(--text-primary)",
  whiteSpace: "pre-wrap",
};

const composerStyle: React.CSSProperties = {
  minHeight: "40px",
  display: "flex",
  alignItems: "center",
  gap: "8px",
  padding: "8px 10px",
  borderTop: "1px solid var(--border)",
};

const inputStyle: React.CSSProperties = {
  flex: 1,
  height: "28px",
  background: "var(--bg-tertiary)",
  border: "1px solid var(--border)",
  borderRadius: "6px",
  color: "var(--text-primary)",
  fontFamily: "var(--font-sans)",
  fontSize: "12px",
  padding: "0 8px",
  outline: "none",
};

const sendButtonStyle: React.CSSProperties = {
  height: "28px",
  minWidth: "54px",
  background: "var(--bg-tertiary)",
  border: "1px solid var(--border)",
  borderRadius: "6px",
  color: "var(--text-secondary)",
  fontFamily: "var(--font-mono)",
  fontSize: "11px",
  cursor: "pointer",
};

const emptyStyle: React.CSSProperties = {
  fontFamily: "var(--font-sans)",
  fontSize: "12px",
  color: "var(--text-muted)",
};

export default CodexChat;
