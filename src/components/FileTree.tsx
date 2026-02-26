import React, { useState, useCallback, useEffect, useRef } from "react";
import type { FileTreeNode } from "../types";
import {
  VscFolder,
  VscFolderOpened,
  VscFile,
  VscFileCode,
  VscFilePdf,
  VscFileMedia,
  VscJson,
  VscMarkdown,
  VscFileZip,
  VscFileBinary,
  VscFileSymlinkFile,
  VscNewFile,
  VscNewFolder,
  VscEdit,
  VscTrash,
  VscCopy,
} from "react-icons/vsc";
import type { IconType } from "react-icons";

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

function getFileIcon(name: string, isDirectory: boolean, isExpanded: boolean) {
  if (isDirectory) {
    return { Icon: isExpanded ? VscFolderOpened : VscFolder, color: "#C09553" };
  }
  const dotIdx = name.lastIndexOf(".");
  if (dotIdx > 0) {
    const ext = name.slice(dotIdx + 1).toLowerCase();
    const match = EXT_ICON_MAP[ext];
    if (match) return { Icon: match.icon, color: match.color };
  }
  return { Icon: VscFile, color: "var(--text-muted)" };
}

// --- Context Menu ---

type ContextMenuTarget =
  | { kind: "empty"; dir: string }
  | { kind: "directory"; path: string; name: string }
  | { kind: "file"; path: string; name: string; parentDir: string };

interface ContextMenuState {
  x: number;
  y: number;
  target: ContextMenuTarget;
}

interface MenuItemDef {
  label: string;
  icon: React.ReactNode;
  onClick: () => void;
  danger?: boolean;
}

const MenuItem: React.FC<{ item: MenuItemDef }> = ({ item }) => (
  <div
    style={{
      ...menuItemStyle,
      color: item.danger ? "var(--error)" : "var(--text-primary)",
    }}
    onClick={item.onClick}
    onMouseEnter={(e) => { e.currentTarget.style.background = "var(--bg-tertiary)"; }}
    onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
  >
    {item.icon}
    <span>{item.label}</span>
  </div>
);

const MenuSeparator: React.FC = () => <div style={menuSepStyle} />;

const ContextMenu: React.FC<{
  state: ContextMenuState;
  onClose: () => void;
  onCreateFile: (dir: string) => void;
  onCreateFolder: (dir: string) => void;
  onRename: (path: string, currentName: string) => void;
  onDelete: (path: string, isDirectory: boolean, name: string) => void;
  onCopyPath: (path: string) => void;
}> = ({ state, onClose, onCreateFile, onCreateFolder, onRename, onDelete, onCopyPath }) => {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [onClose]);

  const { target } = state;

  const items: (MenuItemDef | "separator")[] = [];

  if (target.kind === "empty") {
    items.push(
      { label: "New File", icon: <VscNewFile size={14} />, onClick: () => { onCreateFile(target.dir); onClose(); } },
      { label: "New Folder", icon: <VscNewFolder size={14} />, onClick: () => { onCreateFolder(target.dir); onClose(); } },
    );
  } else if (target.kind === "directory") {
    items.push(
      { label: "New File", icon: <VscNewFile size={14} />, onClick: () => { onCreateFile(target.path); onClose(); } },
      { label: "New Folder", icon: <VscNewFolder size={14} />, onClick: () => { onCreateFolder(target.path); onClose(); } },
      "separator",
      { label: "Rename", icon: <VscEdit size={14} />, onClick: () => { onRename(target.path, target.name); onClose(); } },
      { label: "Copy Path", icon: <VscCopy size={14} />, onClick: () => { onCopyPath(target.path); onClose(); } },
      "separator",
      { label: "Delete", icon: <VscTrash size={14} />, onClick: () => { onDelete(target.path, true, target.name); onClose(); }, danger: true },
    );
  } else {
    // file
    items.push(
      { label: "Rename", icon: <VscEdit size={14} />, onClick: () => { onRename(target.path, target.name); onClose(); } },
      { label: "Copy Path", icon: <VscCopy size={14} />, onClick: () => { onCopyPath(target.path); onClose(); } },
      "separator",
      { label: "New File", icon: <VscNewFile size={14} />, onClick: () => { onCreateFile(target.parentDir); onClose(); } },
      { label: "New Folder", icon: <VscNewFolder size={14} />, onClick: () => { onCreateFolder(target.parentDir); onClose(); } },
      "separator",
      { label: "Delete", icon: <VscTrash size={14} />, onClick: () => { onDelete(target.path, false, target.name); onClose(); }, danger: true },
    );
  }

  return (
    <div ref={ref} style={{ ...menuStyle, top: state.y, left: state.x }}>
      {items.map((item, i) =>
        item === "separator"
          ? <MenuSeparator key={`sep-${i}`} />
          : <MenuItem key={item.label} item={item} />,
      )}
    </div>
  );
};

// --- Inline Name Input ---

const InlineInput: React.FC<{
  initialValue?: string;
  icon: { Icon: IconType; color: string };
  depth: number;
  onSubmit: (value: string) => void;
  onCancel: () => void;
  placeholder?: string;
}> = ({ initialValue = "", icon, depth, onSubmit, onCancel, placeholder }) => {
  const [value, setValue] = useState(initialValue);
  const inputRef = useRef<HTMLInputElement>(null);
  const submittedRef = useRef(false);

  useEffect(() => {
    requestAnimationFrame(() => {
      const el = inputRef.current;
      if (!el) return;
      el.focus();
      // Select the name part before extension for renames
      if (initialValue) {
        const dotIdx = initialValue.lastIndexOf(".");
        el.setSelectionRange(0, dotIdx > 0 ? dotIdx : initialValue.length);
      }
    });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      const trimmed = value.trim();
      if (trimmed && trimmed !== initialValue) {
        submittedRef.current = true;
        onSubmit(trimmed);
      } else {
        onCancel();
      }
    } else if (e.key === "Escape") {
      onCancel();
    }
  };

  const handleBlur = () => {
    // Don't cancel if we already submitted via Enter
    if (!submittedRef.current) onCancel();
  };

  const paddingLeft = 12 + depth * 12;

  return (
    <div style={{ ...rowStyle, paddingLeft: `${paddingLeft}px` }}>
      <span style={iconWrapStyle}>
        <icon.Icon size={14} color={icon.color} />
      </span>
      <input
        ref={inputRef}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={handleKeyDown}
        onBlur={handleBlur}
        placeholder={placeholder}
        style={inlineInputStyle}
      />
    </div>
  );
};

// --- FileTree ---

interface FileTreeProps {
  rootName: string | null;
  rootPath: string | null;
  nodes: FileTreeNode[];
  activeFilePath: string | null;
  onToggleExpand: (path: string) => void;
  onOpenFile: (path: string) => void;
  onCreateFile: (parentDir: string, name: string) => Promise<string>;
  onCreateFolder: (parentDir: string, name: string) => Promise<void>;
  onRenameNode: (oldPath: string, newName: string) => Promise<string>;
  onDeleteNode: (path: string, isDirectory: boolean) => Promise<void>;
}

type InlineInputState =
  | { mode: "create"; parentDir: string; kind: "file" | "folder"; depth: number }
  | { mode: "rename"; path: string; currentName: string; isDirectory: boolean; depth: number };

const FileTree: React.FC<FileTreeProps> = ({
  rootName,
  rootPath,
  nodes,
  activeFilePath,
  onToggleExpand,
  onOpenFile,
  onCreateFile,
  onCreateFolder,
  onRenameNode,
  onDeleteNode,
}) => {
  const [ctxMenu, setCtxMenu] = useState<ContextMenuState | null>(null);
  const [input, setInput] = useState<InlineInputState | null>(null);

  const closeCtxMenu = useCallback(() => setCtxMenu(null), []);

  const handleContextMenu = useCallback(
    (e: React.MouseEvent, target: ContextMenuTarget) => {
      e.preventDefault();
      e.stopPropagation();
      setCtxMenu({ x: e.clientX, y: e.clientY, target });
    },
    [],
  );

  const handleRootContextMenu = useCallback(
    (e: React.MouseEvent) => {
      if (!rootPath) return;
      // Only trigger if not on a tree row
      if ((e.target as HTMLElement).closest("[data-tree-row]")) return;
      e.preventDefault();
      setCtxMenu({ x: e.clientX, y: e.clientY, target: { kind: "empty", dir: rootPath } });
    },
    [rootPath],
  );

  const startCreate = useCallback((dir: string, kind: "file" | "folder") => {
    const depth = dir === rootPath ? 0 : findDirDepth(nodes, dir, 0);
    setInput({ mode: "create", parentDir: dir, kind, depth });
  }, [rootPath, nodes]);

  const startRename = useCallback((path: string, currentName: string) => {
    const parentDir = path.split("/").slice(0, -1).join("/");
    const depth = parentDir === rootPath ? 0 : findDirDepth(nodes, parentDir, 0);
    const node = findNodeByPath(nodes, path);
    setInput({ mode: "rename", path, currentName, isDirectory: node?.isDirectory ?? false, depth });
  }, [rootPath, nodes]);

  const handleDelete = useCallback(async (path: string, isDirectory: boolean, name: string) => {
    const kind = isDirectory ? "folder" : "file";
    const confirmed = window.confirm(`Delete ${kind} "${name}"?`);
    if (!confirmed) return;
    await onDeleteNode(path, isDirectory);
  }, [onDeleteNode]);

  const handleCopyPath = useCallback((path: string) => {
    navigator.clipboard.writeText(path);
  }, []);

  const handleCreateSubmit = useCallback(
    async (value: string) => {
      if (!input || input.mode !== "create") return;
      setInput(null);
      if (input.kind === "file") {
        const path = await onCreateFile(input.parentDir, value);
        onOpenFile(path);
      } else {
        await onCreateFolder(input.parentDir, value);
      }
    },
    [input, onCreateFile, onCreateFolder, onOpenFile],
  );

  const handleRenameSubmit = useCallback(
    async (value: string) => {
      if (!input || input.mode !== "rename") return;
      setInput(null);
      const newPath = await onRenameNode(input.path, value);
      // If the renamed file was the active file, open the new path
      if (input.path === activeFilePath) {
        onOpenFile(newPath);
      }
    },
    [input, onRenameNode, activeFilePath, onOpenFile],
  );

  const handleInputCancel = useCallback(() => setInput(null), []);

  return (
    <div style={containerStyle} onContextMenu={handleRootContextMenu}>
      {rootName && (
        <div style={headerStyle}>
          {rootName.toUpperCase()}
        </div>
      )}
      <div style={treeStyle}>
        {nodes.map((node) => (
          <TreeRow
            key={node.path}
            node={node}
            depth={0}
            activeFilePath={activeFilePath}
            onToggleExpand={onToggleExpand}
            onOpenFile={onOpenFile}
            onContextMenu={handleContextMenu}
            renaming={input?.mode === "rename" ? input : null}
            onRenameSubmit={handleRenameSubmit}
            onInputCancel={handleInputCancel}
            creating={input?.mode === "create" ? input : null}
            onCreateSubmit={handleCreateSubmit}
            rootPath={rootPath}
          />
        ))}
        {/* Inline create input at root level */}
        {input?.mode === "create" && input.parentDir === rootPath && (
          <InlineInput
            icon={input.kind === "folder" ? { Icon: VscFolder, color: "#C09553" } : { Icon: VscFile, color: "var(--text-muted)" }}
            depth={0}
            onSubmit={handleCreateSubmit}
            onCancel={handleInputCancel}
            placeholder={input.kind === "folder" ? "folder name" : "file name"}
          />
        )}
      </div>
      {ctxMenu && (
        <ContextMenu
          state={ctxMenu}
          onClose={closeCtxMenu}
          onCreateFile={(dir) => startCreate(dir, "file")}
          onCreateFolder={(dir) => startCreate(dir, "folder")}
          onRename={startRename}
          onDelete={handleDelete}
          onCopyPath={handleCopyPath}
        />
      )}
    </div>
  );
};

function findDirDepth(nodes: FileTreeNode[], targetPath: string, currentDepth: number): number {
  for (const node of nodes) {
    if (node.path === targetPath) return currentDepth + 1;
    if (node.children) {
      const found = findDirDepth(node.children, targetPath, currentDepth + 1);
      if (found >= 0) return found;
    }
  }
  return -1;
}

function findNodeByPath(nodes: FileTreeNode[], targetPath: string): FileTreeNode | null {
  for (const node of nodes) {
    if (node.path === targetPath) return node;
    if (node.children) {
      const found = findNodeByPath(node.children, targetPath);
      if (found) return found;
    }
  }
  return null;
}

// --- TreeRow ---

interface TreeRowProps {
  node: FileTreeNode;
  depth: number;
  activeFilePath: string | null;
  rootPath: string | null;
  onToggleExpand: (path: string) => void;
  onOpenFile: (path: string) => void;
  onContextMenu: (e: React.MouseEvent, target: ContextMenuTarget) => void;
  renaming: { path: string; currentName: string; isDirectory: boolean; depth: number } | null;
  onRenameSubmit: (value: string) => void;
  onInputCancel: () => void;
  creating: { parentDir: string; kind: "file" | "folder"; depth: number } | null;
  onCreateSubmit: (value: string) => void;
}

const TreeRow: React.FC<TreeRowProps> = ({
  node,
  depth,
  activeFilePath,
  rootPath,
  onToggleExpand,
  onOpenFile,
  onContextMenu,
  renaming,
  onRenameSubmit,
  onInputCancel,
  creating,
  onCreateSubmit,
}) => {
  const isActive = node.path === activeFilePath;
  const isRenaming = renaming?.path === node.path;
  const paddingLeft = 12 + depth * 12;
  const { Icon, color } = getFileIcon(node.name, node.isDirectory, node.isExpanded);

  const handleClick = () => {
    if (node.isDirectory) {
      onToggleExpand(node.path);
    } else {
      onOpenFile(node.path);
    }
  };

  const handleRightClick = (e: React.MouseEvent) => {
    if (node.isDirectory) {
      onContextMenu(e, { kind: "directory", path: node.path, name: node.name });
    } else {
      const parentDir = node.path.split("/").slice(0, -1).join("/");
      onContextMenu(e, { kind: "file", path: node.path, name: node.name, parentDir });
    }
  };

  if (isRenaming) {
    return (
      <InlineInput
        initialValue={node.name}
        icon={{ Icon, color }}
        depth={depth}
        onSubmit={onRenameSubmit}
        onCancel={onInputCancel}
      />
    );
  }

  return (
    <>
      <div
        data-tree-row
        style={{
          ...rowStyle,
          paddingLeft: `${paddingLeft}px`,
          background: isActive ? "var(--bg-tertiary)" : "transparent",
        }}
        onClick={handleClick}
        onContextMenu={handleRightClick}
        title={node.path}
      >
        <span style={iconWrapStyle}>
          <Icon size={14} color={color} />
        </span>
        <span
          style={{
            ...nameStyle,
            fontWeight: node.isDirectory ? 500 : 400,
            color: isActive
              ? "var(--text-primary)"
              : node.isDirectory
                ? "var(--text-secondary)"
                : "var(--text-muted)",
          }}
        >
          {node.name}
        </span>
      </div>
      {node.isDirectory && node.isExpanded && node.children && (
        <>
          {node.children.map((child) => (
            <TreeRow
              key={child.path}
              node={child}
              depth={depth + 1}
              activeFilePath={activeFilePath}
              rootPath={rootPath}
              onToggleExpand={onToggleExpand}
              onOpenFile={onOpenFile}
              onContextMenu={onContextMenu}
              renaming={renaming}
              onRenameSubmit={onRenameSubmit}
              onInputCancel={onInputCancel}
              creating={creating}
              onCreateSubmit={onCreateSubmit}
            />
          ))}
          {creating && creating.parentDir === node.path && (
            <InlineInput
              icon={creating.kind === "folder" ? { Icon: VscFolder, color: "#C09553" } : { Icon: VscFile, color: "var(--text-muted)" }}
              depth={depth + 1}
              onSubmit={onCreateSubmit}
              onCancel={onInputCancel}
              placeholder={creating.kind === "folder" ? "folder name" : "file name"}
            />
          )}
        </>
      )}
    </>
  );
};

// --- Styles ---

const containerStyle: React.CSSProperties = {
  height: "100%",
  display: "flex",
  flexDirection: "column",
  background: "var(--bg-primary)",
  overflow: "hidden",
  userSelect: "none",
  position: "relative",
};

const headerStyle: React.CSSProperties = {
  padding: "10px 12px 6px",
  fontSize: "11px",
  fontWeight: 600,
  fontFamily: "var(--font-sans)",
  color: "var(--text-muted)",
  letterSpacing: "0.05em",
};

const treeStyle: React.CSSProperties = {
  flex: 1,
  overflowY: "auto",
  overflowX: "hidden",
};

const rowStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: "4px",
  padding: "3px 8px",
  cursor: "pointer",
  whiteSpace: "nowrap",
  overflow: "hidden",
  textOverflow: "ellipsis",
};

const iconWrapStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  width: "16px",
  flexShrink: 0,
};

const nameStyle: React.CSSProperties = {
  fontSize: "12px",
  fontFamily: "var(--font-sans)",
  overflow: "hidden",
  textOverflow: "ellipsis",
};

const menuStyle: React.CSSProperties = {
  position: "fixed",
  zIndex: 2000,
  background: "var(--bg-secondary)",
  border: "1px solid var(--border)",
  borderRadius: "8px",
  padding: "4px 0",
  boxShadow: "0 8px 24px rgba(0,0,0,0.35)",
  minWidth: "160px",
};

const menuItemStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: "8px",
  padding: "7px 12px",
  cursor: "pointer",
  fontSize: "12px",
  fontFamily: "var(--font-sans)",
  color: "var(--text-primary)",
  transition: "background 0.1s",
};

const menuSepStyle: React.CSSProperties = {
  height: "1px",
  background: "var(--border)",
  margin: "4px 0",
};

const inlineInputStyle: React.CSSProperties = {
  flex: 1,
  background: "var(--bg-tertiary)",
  border: "1px solid var(--accent)",
  borderRadius: "3px",
  outline: "none",
  color: "var(--text-primary)",
  fontFamily: "var(--font-sans)",
  fontSize: "12px",
  padding: "1px 4px",
  minWidth: 0,
};

export default FileTree;
