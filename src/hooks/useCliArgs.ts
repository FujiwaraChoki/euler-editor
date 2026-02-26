import { useState, useEffect } from "react";

interface UseCliArgsReturn {
  initialFilePath: string | null;
}

export function useCliArgs(): UseCliArgsReturn {
  const [initialFilePath, setInitialFilePath] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function parseArgs() {
      try {
        const { getMatches } = await import("@tauri-apps/plugin-cli");
        const matches = await getMatches();

        if (cancelled) return;

        // Check for positional args (file path passed as first argument)
        if (matches.args && matches.args["file"]) {
          const fileArg = matches.args["file"];
          if (fileArg.value && typeof fileArg.value === "string") {
            setInitialFilePath(fileArg.value);
          }
        }
      } catch {
        // CLI plugin not available in dev mode, silently ignore
      }
    }

    parseArgs();
    return () => {
      cancelled = true;
    };
  }, []);

  return { initialFilePath };
}
