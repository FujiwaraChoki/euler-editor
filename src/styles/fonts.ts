export type FontKind = "ui" | "code";

export interface FontOption {
  name: string;
  previewFamily: string;
}

export const DEFAULT_UI_FONT = "Geist";
export const DEFAULT_CODE_FONT = "Geist Mono";

const UI_ALIAS_SYSTEM = "System Sans";
const UI_ALIAS_SERIF = "Serif";

const LEGACY_FONT_ALIASES: Record<string, string> = {
  geist: DEFAULT_UI_FONT,
  "geist-mono": DEFAULT_CODE_FONT,
  "system-sans": UI_ALIAS_SYSTEM,
  serif: UI_ALIAS_SERIF,
  "sf-mono": "SF Mono",
  courier: "Courier New",
};

const UI_PINNED_FONTS = [DEFAULT_UI_FONT, UI_ALIAS_SYSTEM, UI_ALIAS_SERIF];
const CODE_PINNED_FONTS = [DEFAULT_CODE_FONT, "SF Mono", "Courier New"];

function dedupeFonts(fonts: string[]): string[] {
  const seen = new Set<string>();
  const unique: string[] = [];

  for (const font of fonts) {
    const trimmed = font.trim();
    if (!trimmed) continue;
    const key = trimmed.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    unique.push(trimmed);
  }

  return unique;
}

function quoteFontName(fontName: string): string {
  if (fontName.includes(",")) return fontName;
  if (fontName.startsWith("-")) return fontName;
  if (/^[a-z0-9-]+$/i.test(fontName)) return fontName;
  return `"${fontName.replace(/"/g, "\\\"")}"`;
}

export function normalizeStoredFontName(value: string | undefined, kind: FontKind): string {
  const fallback = kind === "ui" ? DEFAULT_UI_FONT : DEFAULT_CODE_FONT;
  if (!value || !value.trim()) return fallback;
  return LEGACY_FONT_ALIASES[value] ?? value.trim();
}

export function fontCssFromName(fontName: string, kind: FontKind): string {
  const normalized = normalizeStoredFontName(fontName, kind);

  if (normalized === UI_ALIAS_SYSTEM) {
    return "-apple-system, BlinkMacSystemFont, \"Segoe UI\", \"Helvetica Neue\", Arial, sans-serif";
  }

  if (normalized === UI_ALIAS_SERIF) {
    return "Iowan Old Style, \"Palatino Linotype\", \"Book Antiqua\", Palatino, \"Times New Roman\", serif";
  }

  const fallback = kind === "ui"
    ? "-apple-system, BlinkMacSystemFont, \"Segoe UI\", sans-serif"
    : "\"SF Mono\", Menlo, Consolas, monospace";

  return `${quoteFontName(normalized)}, ${fallback}`;
}

export function buildFontOptions(systemFonts: string[], kind: FontKind): FontOption[] {
  const pinned = kind === "ui" ? UI_PINNED_FONTS : CODE_PINNED_FONTS;
  const uniqueSystemFonts = dedupeFonts(systemFonts).sort((a, b) => a.localeCompare(b));
  const combined = dedupeFonts([...pinned, ...uniqueSystemFonts]);

  return combined.map((name) => ({
    name,
    previewFamily: fontCssFromName(name, kind),
  }));
}
