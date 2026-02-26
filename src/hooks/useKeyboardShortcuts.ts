import { useEffect } from "react";

type ShortcutMap = Record<string, () => void>;

/**
 * Registers global keyboard shortcuts.
 *
 * Shortcut format: "mod+k" where "mod" maps to Cmd on Mac and Ctrl on Windows/Linux.
 * Other modifiers: "shift", "alt".
 * Examples: "mod+k", "mod+s", "mod+shift+p"
 */
export function useKeyboardShortcuts(shortcuts: ShortcutMap) {
  useEffect(() => {
    const isMac = navigator.platform.toUpperCase().includes("MAC");

    function matchesKey(event: KeyboardEvent, key: string): boolean {
      const normalizedKey = key.toLowerCase();

      if (normalizedKey === "plus") {
        return event.key === "+" || event.key === "=" || event.code === "NumpadAdd";
      }

      if (normalizedKey === "minus") {
        return event.key === "-" || event.key === "_" || event.code === "NumpadSubtract";
      }

      if (normalizedKey === "equal" || normalizedKey === "equals") {
        return event.key === "=" || event.key === "+";
      }

      return event.key.toLowerCase() === normalizedKey;
    }

    function handleKeyDown(e: KeyboardEvent) {
      for (const [shortcut, callback] of Object.entries(shortcuts)) {
        const parts = shortcut.toLowerCase().split("+");
        const key = parts[parts.length - 1];
        const requiresMod = parts.includes("mod");
        const requiresShift = parts.includes("shift");
        const requiresAlt = parts.includes("alt");

        const modPressed = isMac ? e.metaKey : e.ctrlKey;

        if (
          matchesKey(e, key) &&
          modPressed === requiresMod &&
          e.shiftKey === requiresShift &&
          e.altKey === requiresAlt
        ) {
          e.preventDefault();
          e.stopPropagation();
          callback();
          return;
        }
      }
    }

    window.addEventListener("keydown", handleKeyDown, true);
    return () => {
      window.removeEventListener("keydown", handleKeyDown, true);
    };
  }, [shortcuts]);
}
