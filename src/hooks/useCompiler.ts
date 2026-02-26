import { useState, useRef, useEffect, useCallback } from "react";
import type { CompileResult } from "../types";
import { compileLatex } from "../lib/tauri-commands";

interface UseCompilerOptions {
  content: string;
  fileStem: string;
  compiler: string;
  debounceMs: number;
  filePath?: string | null;
}

interface UseCompilerReturn {
  compileResult: CompileResult | null;
  isCompiling: boolean;
  compilationId: number;
}

export function useCompiler({
  content,
  fileStem,
  compiler,
  debounceMs,
  filePath,
}: UseCompilerOptions): UseCompilerReturn {
  const [compileResult, setCompileResult] = useState<CompileResult | null>(null);
  const [isCompiling, setIsCompiling] = useState(false);
  const [compilationId, setCompilationId] = useState(0);

  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const compilationCounterRef = useRef(0);

  const triggerCompile = useCallback(
    async (currentContent: string, currentFileStem: string, currentCompiler: string, currentFilePath?: string | null) => {
      compilationCounterRef.current += 1;
      const thisCompilationId = compilationCounterRef.current;

      setIsCompiling(true);
      setCompilationId(thisCompilationId);

      try {
        const result = await compileLatex(currentContent, currentFileStem, currentCompiler, currentFilePath);

        // Discard stale results: only apply if this is still the latest compilation
        if (thisCompilationId === compilationCounterRef.current) {
          setCompileResult(result);
          setIsCompiling(false);
        }
      } catch (err) {
        if (thisCompilationId === compilationCounterRef.current) {
          setCompileResult({
            success: false,
            pdf_base64: null,
            log: String(err),
            errors: [String(err)],
          });
          setIsCompiling(false);
        }
      }
    },
    []
  );

  useEffect(() => {
    // Don't compile empty content
    if (!content.trim()) {
      return;
    }

    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    timeoutRef.current = setTimeout(() => {
      triggerCompile(content, fileStem, compiler, filePath);
    }, debounceMs);

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [content, fileStem, compiler, debounceMs, filePath, triggerCompile]);

  return { compileResult, isCompiling, compilationId };
}
