import { useState, useCallback, useEffect, useRef } from "react";
import { readDir, writeTextFile, mkdir, rename, remove } from "@tauri-apps/plugin-fs";
import type { FileTreeNode } from "../types";

async function loadChildren(dirPath: string): Promise<FileTreeNode[]> {
  const entries = await readDir(dirPath);
  const nodes: FileTreeNode[] = entries
    .filter((e) => !e.name.startsWith("."))
    .map((e) => ({
      name: e.name,
      path: `${dirPath}/${e.name}`,
      isDirectory: e.isDirectory,
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

function insertSorted(nodes: FileTreeNode[], newNode: FileTreeNode): FileTreeNode[] {
  const result = [...nodes, newNode];
  result.sort((a, b) => {
    if (a.isDirectory !== b.isDirectory) return a.isDirectory ? -1 : 1;
    return a.name.localeCompare(b.name);
  });
  return result;
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

  const toggleExpand = useCallback((path: string) => {
    setNodes((prev) =>
      updateNodeInTree(prev, path, (node) => {
        if (!node.isDirectory) return node;

        // Collapsing
        if (node.isExpanded) {
          return { ...node, isExpanded: false };
        }

        // Expanding – children already loaded
        if (node.children !== null && node.children.length > 0) {
          return { ...node, isExpanded: true };
        }

        // Expanding – need to load children
        loadChildren(path)
          .then((children) => {
            setNodes((current) =>
              updateNodeInTree(current, path, (n) => ({
                ...n,
                children,
                isExpanded: true,
              })),
            );
          })
          .catch(() => {
            setNodes((current) =>
              updateNodeInTree(current, path, (n) => ({
                ...n,
                children: [],
                isExpanded: true,
              })),
            );
          });

        return { ...node, isExpanded: false };
      }),
    );
  }, []);

  const createFile = useCallback(async (parentDir: string, name: string): Promise<string> => {
    const filePath = `${parentDir}/${name}`;
    await writeTextFile(filePath, "");

    const newNode: FileTreeNode = {
      name,
      path: filePath,
      isDirectory: false,
      children: [],
      isExpanded: false,
    };

    // Insert into tree
    if (parentDir === currentRootPath.current) {
      setNodes((prev) => insertSorted(prev, newNode));
    } else {
      setNodes((prev) =>
        updateNodeInTree(prev, parentDir, (node) => ({
          ...node,
          children: insertSorted(node.children ?? [], newNode),
          isExpanded: true,
        })),
      );
    }

    return filePath;
  }, []);

  const createFolder = useCallback(async (parentDir: string, name: string): Promise<void> => {
    const dirPath = `${parentDir}/${name}`;
    await mkdir(dirPath);

    const newNode: FileTreeNode = {
      name,
      path: dirPath,
      isDirectory: true,
      children: null,
      isExpanded: false,
    };

    if (parentDir === currentRootPath.current) {
      setNodes((prev) => insertSorted(prev, newNode));
    } else {
      setNodes((prev) =>
        updateNodeInTree(prev, parentDir, (node) => ({
          ...node,
          children: insertSorted(node.children ?? [], newNode),
          isExpanded: true,
        })),
      );
    }
  }, []);

  const renameNode = useCallback(async (oldPath: string, newName: string): Promise<string> => {
    const parentDir = oldPath.split("/").slice(0, -1).join("/");
    const newPath = `${parentDir}/${newName}`;
    await rename(oldPath, newPath);

    // Update in tree: remove old, insert renamed
    setNodes((prev) => {
      // Find the node to get its properties
      let found: FileTreeNode | null = null;
      const findNode = (nodes: FileTreeNode[]): void => {
        for (const n of nodes) {
          if (n.path === oldPath) { found = n; return; }
          if (n.children) findNode(n.children);
        }
      };
      findNode(prev);
      if (!found) return prev;

      const renamedNode: FileTreeNode = {
        ...(found as FileTreeNode),
        name: newName,
        path: newPath,
      };

      const withoutOld = removeNodeFromTree(prev, oldPath);

      if (parentDir === currentRootPath.current) {
        return insertSorted(withoutOld, renamedNode);
      }
      return updateNodeInTree(withoutOld, parentDir, (node) => ({
        ...node,
        children: insertSorted(node.children ?? [], renamedNode),
      }));
    });

    return newPath;
  }, []);

  const deleteNode = useCallback(async (path: string, isDirectory: boolean): Promise<void> => {
    await remove(path, { recursive: isDirectory });
    setNodes((prev) => removeNodeFromTree(prev, path));
  }, []);

  return { nodes, rootPath: currentRootPath.current, toggleExpand, rootName, createFile, createFolder, renameNode, deleteNode };
}
