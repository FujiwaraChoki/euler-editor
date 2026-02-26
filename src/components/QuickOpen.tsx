import React, { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { readDir } from "@tauri-apps/plugin-fs";
import {
  VscFile,
  VscFileCode,
  VscFilePdf,
  VscFileMedia,
  VscJson,
  VscMarkdown,
  VscFileZip,
  VscFileBinary,
  VscFileSymlinkFile,
} from "react-icons/vsc";
import type { IconType } from "react-icons";

interface QuickOpenProps {
  isOpen: boolean;
  onClose: () => void;
  rootPath: string | null;
  onOpenFile: (path: string) => void;
  currentFilePath: string | null;
}

interface FileEntry {
  name: string;
  relativePath: string;
  fullPath: string;
}

const EXT_ICON_MAP: Record<string, { icon: IconType; color: string }> = {
  tex:  { icon: VscFileCode,  color: "#3D9970" },
  sty:  { icon: VscFileCode,  color: "#3D9970" },
  cls:  { icon: VscFileCode,  color: "#3D9970" },
  bib:  { icon: VscFileCode,  color: "#85992C" },
  bst:  { icon: VscFileCode,  color: "#85992C" },
  pdf:  { icon: VscFilePdf,   color: "#E24D38" },
  png:  { icon: VscFileMedia,  color: "#A074C4" },
  jpg:  { icon: VscFileMedia,  color: "#A074C4" },
  jpeg: { icon: VscFileMedia,  color: "#A074C4" },
  gif:  { icon: VscFileMedia,  color: "#A074C4" },
  svg:  { icon: VscFileMedia,  color: "#A074C4" },
  eps:  { icon: VscFileMedia,  color: "#A074C4" },
  json: { icon: VscJson,       color: "#E6B830" },
  yaml: { icon: VscFileCode,   color: "#CB171E" },
  yml:  { icon: VscFileCode,   color: "#CB171E" },
  toml: { icon: VscFileCode,   color: "#9C4121" },
  xml:  { icon: VscFileCode,   color: "#E37933" },
  csv:  { icon: VscFileCode,   color: "#4EA44E" },
  md:   { icon: VscMarkdown,   color: "#519ABA" },
  txt:  { icon: VscFile,       color: "#8E8E93" },
  log:  { icon: VscFile,       color: "#8E8E93" },
  zip:  { icon: VscFileZip,    color: "#AFBF43" },
  gz:   { icon: VscFileZip,    color: "#AFBF43" },
  tar:  { icon: VscFileZip,    color: "#AFBF43" },
  aux:  { icon: VscFileBinary,  color: "#6E6E73" },
  out:  { icon: VscFileBinary,  color: "#6E6E73" },
  toc:  { icon: VscFileBinary,  color: "#6E6E73" },
  lof:  { icon: VscFileBinary,  color: "#6E6E73" },
  lot:  { icon: VscFileBinary,  color: "#6E6E73" },
  bbl:  { icon: VscFileBinary,  color: "#6E6E73" },
  blg:  { icon: VscFileBinary,  color: "#6E6E73" },
  lnk:  { icon: VscFileSymlinkFile, color: "#8E8E93" },
};

const SKIP_DIRS = new Set(["node_modules", ".git", "build", "dist", "out"]);
const MAX_DEPTH = 8;

function getFileIcon(name: string): { Icon: IconType; color: string } {
  const dotIdx = name.lastIndexOf(".");
  if (dotIdx > 0) {
    const ext = name.slice(dotIdx + 1).toLowerCase();
    const match = EXT_ICON_MAP[ext];
    if (match) return { Icon: match.icon, color: match.color };
  }
  return { Icon: VscFile, color: "var(--text-muted)" };
}

async function scanFiles(rootPath: string): Promise<FileEntry[]> {
  const files: FileEntry[] = [];

  async function walk(dirPath: string, depth: number) {
    if (depth > MAX_DEPTH) return;
    let entries;
    try {
      entries = await readDir(dirPath);
    } catch {
      return;
    }
    for (const entry of entries) {
      if (entry.name.startsWith(".")) continue;
      const fullPath = `${dirPath}/${entry.name}`;
      if (entry.isDirectory) {
        if (SKIP_DIRS.has(entry.name)) continue;
        await walk(fullPath, depth + 1);
      } else {
        files.push({
          name: entry.name,
          relativePath: fullPath.slice(rootPath.length + 1),
          fullPath,
        });
      }
    }
  }

  await walk(rootPath, 0);

  // Sort: .tex first, then alphabetical by relative path
  files.sort((a, b) => {
    const aIsTex = a.name.toLowerCase().endsWith(".tex");
    const bIsTex = b.name.toLowerCase().endsWith(".tex");
    if (aIsTex !== bIsTex) return aIsTex ? -1 : 1;
    return a.relativePath.localeCompare(b.relativePath);
  });

  return files;
}

function fuzzyScore(query: string, entry: FileEntry): number {
  const q = query.toLowerCase();
  const nameLower = entry.name.toLowerCase();
  const pathLower = entry.relativePath.toLowerCase();

  // Filename starts with query
  if (nameLower.startsWith(q)) return 100;
  // Filename contains query
  if (nameLower.includes(q)) return 75;
  // Relative path contains query
  if (pathLower.includes(q)) return 50;
  // Character-order match in path
  let qi = 0;
  for (let i = 0; i < pathLower.length && qi < q.length; i++) {
    if (pathLower[i] === q[qi]) qi++;
  }
  if (qi === q.length) return 25;

  return 0;
}

const QuickOpen: React.FC<QuickOpenProps> = ({
  isOpen,
  onClose,
  rootPath,
  onOpenFile,
  currentFilePath,
}) => {
  const [query, setQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [files, setFiles] = useState<FileEntry[]>([]);
  const [scanning, setScanning] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const generationRef = useRef(0);

  // Scan files when opened
  useEffect(() => {
    if (!isOpen) return;
    setQuery("");
    setSelectedIndex(0);
    setFiles([]);

    if (!rootPath) return;

    setScanning(true);
    const gen = ++generationRef.current;
    scanFiles(rootPath).then((result) => {
      if (gen !== generationRef.current) return;
      setFiles(result);
      setScanning(false);
    }).catch(() => {
      if (gen !== generationRef.current) return;
      setFiles([]);
      setScanning(false);
    });

    requestAnimationFrame(() => {
      inputRef.current?.focus();
    });
  }, [isOpen, rootPath]);

  const filtered = useMemo(() => {
    if (!query.trim()) return files;
    const q = query.trim();
    return files
      .map((f) => ({ file: f, score: fuzzyScore(q, f) }))
      .filter((x) => x.score > 0)
      .sort((a, b) => b.score - a.score)
      .map((x) => x.file);
  }, [query, files]);

  // Clamp selected index
  useEffect(() => {
    if (selectedIndex >= filtered.length) {
      setSelectedIndex(Math.max(0, filtered.length - 1));
    }
  }, [filtered.length, selectedIndex]);

  // Auto-scroll selected item into view
  useEffect(() => {
    const list = listRef.current;
    if (!list) return;
    const item = list.children[selectedIndex] as HTMLElement | undefined;
    item?.scrollIntoView({ block: "nearest" });
  }, [selectedIndex]);

  const handleSelect = useCallback(
    (file: FileEntry) => {
      onOpenFile(file.fullPath);
      onClose();
    },
    [onOpenFile, onClose],
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      switch (e.key) {
        case "Escape":
          e.preventDefault();
          onClose();
          break;
        case "ArrowDown":
          e.preventDefault();
          setSelectedIndex((i) => Math.min(i + 1, filtered.length - 1));
          break;
        case "ArrowUp":
          e.preventDefault();
          setSelectedIndex((i) => Math.max(i - 1, 0));
          break;
        case "Enter":
          e.preventDefault();
          if (filtered[selectedIndex]) {
            handleSelect(filtered[selectedIndex]);
          }
          break;
      }
    },
    [onClose, filtered, selectedIndex, handleSelect],
  );

  if (!isOpen) return null;

  const showNoRoot = !rootPath;
  const showScanning = rootPath && scanning;
  const showEmpty = rootPath && !scanning && filtered.length === 0;

  return (
    <div style={overlayStyle} onClick={onClose}>
      <div style={modalStyle} onClick={(e) => e.stopPropagation()} onKeyDown={handleKeyDown}>
        <div style={inputContainerStyle}>
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSelectedIndex(0);
            }}
            placeholder="Search files by name..."
            style={inputStyle}
          />
        </div>

        <div ref={listRef} style={listStyle}>
          {showNoRoot && <div style={emptyStyle}>Open a file first to browse</div>}
          {showScanning && <div style={emptyStyle}>Scanning files...</div>}
          {showEmpty && <div style={emptyStyle}>No files found</div>}
          {filtered.map((file, i) => {
            const { Icon, color } = getFileIcon(file.name);
            const isCurrent = file.fullPath === currentFilePath;
            return (
              <div
                key={file.fullPath}
                style={{
                  ...itemStyle,
                  background: i === selectedIndex ? "var(--bg-tertiary)" : "transparent",
                }}
                onMouseEnter={() => setSelectedIndex(i)}
                onClick={() => handleSelect(file)}
              >
                <span style={iconStyle}>
                  <Icon size={14} color={color} />
                </span>
                <span style={fileNameStyle}>{file.name}</span>
                <span style={relPathStyle}>{file.relativePath}</span>
                {isCurrent && <span style={badgeStyle}>current</span>}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

// Styles — matching CommandPalette exactly

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
  display: "flex",
  alignItems: "center",
  gap: "8px",
  padding: "8px 16px",
  cursor: "pointer",
  transition: "background 0.1s ease",
};

const iconStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  width: "16px",
  flexShrink: 0,
};

const fileNameStyle: React.CSSProperties = {
  color: "var(--text-primary)",
  fontSize: "13px",
  fontFamily: "var(--font-sans)",
  fontWeight: 500,
  flexShrink: 0,
};

const relPathStyle: React.CSSProperties = {
  color: "var(--text-muted)",
  fontSize: "12px",
  fontFamily: "var(--font-sans)",
  overflow: "hidden",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap",
  flex: 1,
  minWidth: 0,
};

const badgeStyle: React.CSSProperties = {
  fontSize: "10px",
  fontFamily: "var(--font-mono)",
  color: "var(--text-muted)",
  background: "var(--bg-tertiary)",
  padding: "1px 6px",
  borderRadius: "4px",
  border: "1px solid var(--border)",
  flexShrink: 0,
};

const emptyStyle: React.CSSProperties = {
  padding: "24px 16px",
  textAlign: "center",
  color: "var(--text-muted)",
  fontSize: "13px",
  fontFamily: "var(--font-sans)",
};

export default QuickOpen;
