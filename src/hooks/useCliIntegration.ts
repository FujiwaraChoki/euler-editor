import { useCallback, useEffect, useState } from "react";
import { getCliStatus, installCli } from "../lib/tauri-commands";
import type { CliIntegrationStatus } from "../types";

interface UseCliIntegrationReturn {
  status: CliIntegrationStatus | null;
  isLoading: boolean;
  isInstalling: boolean;
  refresh: () => Promise<CliIntegrationStatus | null>;
  install: () => Promise<CliIntegrationStatus>;
}

export function useCliIntegration(): UseCliIntegrationReturn {
  const [status, setStatus] = useState<CliIntegrationStatus | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isInstalling, setIsInstalling] = useState(false);

  const refresh = useCallback(async () => {
    try {
      const nextStatus = await getCliStatus();
      setStatus(nextStatus);
      return nextStatus;
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh().catch(() => {
      setIsLoading(false);
    });
  }, [refresh]);

  const install = useCallback(async () => {
    setIsInstalling(true);
    try {
      const nextStatus = await installCli();
      setStatus(nextStatus);
      return nextStatus;
    } finally {
      setIsInstalling(false);
    }
  }, []);

  return {
    status,
    isLoading,
    isInstalling,
    refresh,
    install,
  };
}
