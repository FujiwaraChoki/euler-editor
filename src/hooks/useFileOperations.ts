import { useState, useCallback, useRef } from "react";
import { open } from "@tauri-apps/plugin-dialog";
import { readFile, writeFile } from "../lib/tauri-commands";

const DEFAULT_LATEX_CONTENT = `\\documentclass{article}
\\usepackage[utf8]{inputenc}
\\usepackage{amsmath}

\\title{Untitled Document}
\\author{}
\\date{\\today}

\\begin{document}

\\maketitle

\\section{Introduction}

Hello, world! This is your new \\LaTeX{} document.

\\end{document}
`;

interface UseFileOperationsReturn {
  filePath: string | null;
  content: string;
  setContent: (content: string) => void;
  openFile: (path: string) => Promise<void>;
  openFileDialog: () => Promise<void>;
  saveFile: () => Promise<void>;
  createNewFile: () => void;
  isDirty: boolean;
  fileName: string;
  hasFile: boolean;
}

export function useFileOperations(): UseFileOperationsReturn {
  const [filePath, setFilePath] = useState<string | null>(null);
  const [content, setContentState] = useState<string>("");
  const [hasFile, setHasFile] = useState(false);
  const [isDirty, setIsDirty] = useState(false);
  const savedContentRef = useRef<string>("");

  const fileName = filePath
    ? filePath.split("/").pop() ?? "Untitled"
    : "Untitled";

  const setContent = useCallback((newContent: string) => {
    setContentState(newContent);
    setIsDirty(newContent !== savedContentRef.current);
  }, []);

  const openFile = useCallback(async (path: string) => {
    const fileContent = await readFile(path);
    setFilePath(path);
    setContentState(fileContent);
    savedContentRef.current = fileContent;
    setIsDirty(false);
    setHasFile(true);
  }, []);

  const openFileDialog = useCallback(async () => {
    const selected = await open({
      multiple: false,
      filters: [{ name: "LaTeX", extensions: ["tex"] }],
    });
    if (selected) {
      await openFile(selected);
    }
  }, [openFile]);

  const saveFile = useCallback(async () => {
    if (!filePath) return;
    await writeFile(filePath, content);
    savedContentRef.current = content;
    setIsDirty(false);
  }, [filePath, content]);

  const createNewFile = useCallback(() => {
    setFilePath(null);
    setContentState(DEFAULT_LATEX_CONTENT);
    savedContentRef.current = DEFAULT_LATEX_CONTENT;
    setIsDirty(false);
    setHasFile(true);
  }, []);

  return {
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
  };
}
