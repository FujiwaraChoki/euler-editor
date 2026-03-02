import { useState, useCallback, useEffect, useRef } from "react";
import { readDir, writeTextFile, mkdir, rename, remove } from "@tauri-apps/plugin-fs";
import type { FileTreeNode } from "../types";

async function loadChildren(dirPath: string): Promise<FileTreeNode[]> {
  const entries = await readDir(dirPath);
  const nodes: FileTreeNode[] = entries
    .filter((e) => typeof e.name === "string" && !e.name.startsWith("."))
    .map((e) => ({
      name: e.name as string,
      path: `${dirPath}/${e.name as string}`,
      isDirectory: Boolean(e.isDirectory),
      children: e.isDirectory ? null : [],
      isExpanded: false,
    }));

  // Sort: directories first, then alphabetical
  nodes.sort((a, b) => {
    if (a.isDirectory !== b.isDirectory) return a.isDirectory ? -1 : 1;
    return a.name.localeCompare(b.name);
  });

  return nodes;
}

function updateNodeInTree(
  nodes: FileTreeNode[],
  targetPath: string,
  updater: (node: FileTreeNode) => FileTreeNode,
): FileTreeNode[] {
  return nodes.map((node) => {
    if (node.path === targetPath) return updater(node);
    if (node.children && node.children.length > 0) {
      const updatedChildren = updateNodeInTree(node.children, targetPath, updater);
      if (updatedChildren !== node.children) {
        return { ...node, children: updatedChildren };
      }
    }
    return node;
  });
}

function mergeChildrenPreservingState(
  previousChildren: FileTreeNode[] | null,
  nextChildren: FileTreeNode[],
): FileTreeNode[] {
  if (!previousChildren || previousChildren.length === 0) {
    return nextChildren;
  }

  const previousByPath = new Map(previousChildren.map((node) => [node.path, node]));

  return nextChildren.map((nextNode) => {
    const previousNode = previousByPath.get(nextNode.path);
    if (!previousNode || !nextNode.isDirectory) {
      return nextNode;
    }

    return {
      ...nextNode,
      isExpanded: previousNode.isExpanded,
      children: previousNode.children,
    };
  });
}

function removeNodeFromTree(nodes: FileTreeNode[], targetPath: string): FileTreeNode[] {
  return nodes
    .filter((node) => node.path !== targetPath)
    .map((node) => {
      if (node.children && node.children.length > 0) {
        const updated = removeNodeFromTree(node.children, targetPath);
        if (updated !== node.children) return { ...node, children: updated };
      }
      return node;
    });
}

interface UseFileTreeReturn {
  nodes: FileTreeNode[];
  rootPath: string | null;
  toggleExpand: (path: string) => void;
  rootName: string | null;
  createFile: (parentDir: string, name: string) => Promise<string>;
  createFolder: (parentDir: string, name: string) => Promise<void>;
  renameNode: (oldPath: string, newName: string) => Promise<string>;
  deleteNode: (path: string, isDirectory: boolean) => Promise<void>;
}

export function useFileTree(rootPath: string | null): UseFileTreeReturn {
  const [nodes, setNodes] = useState<FileTreeNode[]>([]);
  const [rootName, setRootName] = useState<string | null>(null);
  const prevRootPath = useRef<string | null>(null);
  const currentRootPath = useRef<string | null>(null);

  useEffect(() => {
    if (!rootPath || rootPath === prevRootPath.current) return;
    prevRootPath.current = rootPath;
    currentRootPath.current = rootPath;

    let cancelled = false;
    setRootName(rootPath.split("/").pop() ?? null);

    loadChildren(rootPath)
      .then((children) => {
        if (!cancelled) setNodes(children);
      })
      .catch(() => {
        if (!cancelled) setNodes([]);
      });

    return () => {
      cancelled = true;
    };
  }, [rootPath]);

  const refreshDirectory = useCallback(async (dirPath: string, forceExpand: boolean): Promise<void> => {
    const refreshedChildren = await loadChildren(dirPath);
    setNodes((prev) => {
      if (dirPath === currentRootPath.current) {
        return refreshedChildren;
      }

      return updateNodeInTree(prev, dirPath, (node) => ({
        ...node,
        children: mergeChildrenPreservingState(node.children, refreshedChildren),
        isExpanded: forceExpand ? true : node.isExpanded,
      }));
    });
  }, []);

  const toggleExpand = useCallback((path: string) => {
    setNodes((prev) =>
      updateNodeInTree(prev, path, (node) => {
        if (!node.isDirectory) return node;

        // Collapsing
        if (node.isExpanded) {
          return { ...node, isExpanded: false };
        }

        // Expanding – refresh from disk so new files are always detected
        loadChildren(path)
          .then((children) => {
            setNodes((current) =>
              updateNodeInTree(current, path, (n) => ({
                ...n,
                children: mergeChildrenPreservingState(n.children, children),
                isExpanded: n.isExpanded,
              })),
            );
          })
          .catch(() => {
            setNodes((current) =>
              updateNodeInTree(current, path, (n) => ({
                ...n,
                isExpanded: n.isExpanded,
              })),
            );
          });

        return { ...node, isExpanded: true, children: node.children ?? [] };
      }),
    );
  }, []);

  const createFile = useCallback(async (parentDir: string, name: string): Promise<string> => {
    const filePath = `${parentDir}/${name}`;
    await writeTextFile(filePath, "");
    await refreshDirectory(parentDir, true);

    return filePath;
  }, [refreshDirectory]);

  const createFolder = useCallback(async (parentDir: string, name: string): Promise<void> => {
    const dirPath = `${parentDir}/${name}`;
    await mkdir(dirPath);
    await refreshDirectory(parentDir, true);
  }, [refreshDirectory]);

  const renameNode = useCallback(async (oldPath: string, newName: string): Promise<string> => {
    const parentDir = oldPath.split("/").slice(0, -1).join("/");
    const newPath = `${parentDir}/${newName}`;
    await rename(oldPath, newPath);

    await refreshDirectory(parentDir, true);

    return newPath;
  }, [refreshDirectory]);

  const deleteNode = useCallback(async (path: string, isDirectory: boolean): Promise<void> => {
    await remove(path, { recursive: isDirectory });
    const parentDir = path.split("/").slice(0, -1).join("/");

    try {
      await refreshDirectory(parentDir, false);
    } catch {
      setNodes((prev) => removeNodeFromTree(prev, path));
    }
  }, [refreshDirectory]);

  return { nodes, rootPath: currentRootPath.current, toggleExpand, rootName, createFile, createFolder, renameNode, deleteNode };
}
