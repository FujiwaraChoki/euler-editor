import { useCallback, useEffect, useState } from "react";
import { applyCodexEdit, getCodexStatus } from "../lib/tauri-commands";
import type { CodexEditResult, CodexStatus } from "../types";

interface UseCodexReturn {
  status: CodexStatus | null;
  isLoadingStatus: boolean;
  isApplying: boolean;
  refreshStatus: () => Promise<CodexStatus | null>;
  runEdit: (prompt: string, filePath: string) => Promise<CodexEditResult>;
}

export function useCodex(): UseCodexReturn {
  const [status, setStatus] = useState<CodexStatus | null>(null);
  const [isLoadingStatus, setIsLoadingStatus] = useState(true);
  const [isApplying, setIsApplying] = useState(false);

  const refreshStatus = useCallback(async () => {
    try {
      const nextStatus = await getCodexStatus();
      setStatus(nextStatus);
      return nextStatus;
    } finally {
      setIsLoadingStatus(false);
    }
  }, []);

  useEffect(() => {
    refreshStatus().catch(() => {
      setIsLoadingStatus(false);
    });
  }, [refreshStatus]);

  const runEdit = useCallback(async (prompt: string, filePath: string) => {
    setIsApplying(true);
    try {
      return await applyCodexEdit(prompt, filePath);
    } finally {
      setIsApplying(false);
    }
  }, []);

  return {
    status,
    isLoadingStatus,
    isApplying,
    refreshStatus,
    runEdit,
  };
}
